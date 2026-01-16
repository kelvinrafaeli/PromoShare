
import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, Send, Trash2, Edit3, 
  Eye, CheckCircle, Clock, Save, Smartphone, MessageSquare,
  Users, Loader2, Calendar, ArrowRight, X
} from 'lucide-react';
import { AppState, Promotion, Group } from '../types';
import { api, addLog } from '../services/supabase';

interface PromotionsPageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const PromotionsPage: React.FC<PromotionsPageProps> = ({ state, setState }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Partial<Promotion> | null>(null);
  const [previewPromo, setPreviewPromo] = useState<Promotion | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredPromos = useMemo(() => {
    let list = state.promotions;
    
    if (state.user?.role !== 'ADMIN') {
      list = list.filter(p => p.ownerId === state.user?.id);
    }
    
    if (searchTerm) {
      list = list.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (startDate || endDate) {
      list = list.filter(p => {
        if (!p.createdAt) return false;
        const pDate = p.createdAt.split('T')[0];
        const afterStart = !startDate || pDate >= startDate;
        const beforeEnd = !endDate || pDate <= endDate;
        return afterStart && beforeEnd;
      });
    }

    return list;
  }, [state.promotions, state.user, searchTerm, startDate, endDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo?.title || !editingPromo?.price || !editingPromo?.mainCategoryId) return;

    setIsSaving(true);
    const promoToSave: Promotion = {
      id: editingPromo.id || `temp-${Date.now()}`,
      title: editingPromo.title,
      price: Number(editingPromo.price),
      link: editingPromo.link || '',
      imageUrl: editingPromo.imageUrl || 'https://picsum.photos/400/300',
      mainCategoryId: editingPromo.mainCategoryId,
      secondaryCategoryIds: editingPromo.secondaryCategoryIds || [],
      status: editingPromo.status || 'SENT',
      coupon: editingPromo.coupon,
      ownerId: state.user?.id || 'unknown',
      content: editingPromo.content || '',
      scheduledAt: editingPromo.scheduledAt,
      sentAt: editingPromo.status === 'SENT' ? new Date().toISOString() : undefined,
      targetGroupIds: editingPromo.targetGroupIds || [],
    };

    try {
      const savedPromo = await api.savePromotion(promoToSave);
      
      setState(prev => {
        const isUpdate = editingPromo.id && !editingPromo.id.toString().startsWith('temp-');
        const newList = isUpdate
          ? prev.promotions.map(p => p.id === editingPromo.id ? savedPromo : p)
          : [savedPromo, ...prev.promotions.filter(p => p.id !== promoToSave.id)];
        
        return { ...prev, promotions: newList };
      });
      
      setIsModalOpen(false);
      setEditingPromo(null);
    } catch (error: any) {
      addLog('UI_SAVE_PROMO_ERROR', 'ERROR', error);
      alert(error.message || 'Erro ao salvar promoção.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async (promo: Promotion) => {
    setSendingId(promo.id);
    try {
      await api.sendToWebhook(promo);
      alert('Promoção enviada para o webhook com sucesso!');
    } catch (error: any) {
      alert(`Erro ao enviar para webhook: ${error.message}. Certifique-se que o serviço local está rodando.`);
    } finally {
      setSendingId(null);
    }
  };

  const deletePromo = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta promoção?')) {
      setDeletingId(id);
      try {
        await api.deletePromotion(id);
        setState(prev => ({
          ...prev,
          promotions: prev.promotions.filter(p => p.id !== id)
        }));
      } catch (error: any) {
        alert(error.message || 'Erro ao excluir.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Filtros e Busca */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar promoções por título..." 
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setEditingPromo({ mainCategoryId: state.categories[0]?.name || '', targetGroupIds: [] }); setIsModalOpen(true); }}
            className="w-full lg:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 active:scale-95 shrink-0"
          >
            <Plus size={22} />
            Nova Promoção
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 min-w-max">
            <Filter size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">Filtrar por Cadastro</span>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <div className="relative flex-1 sm:w-44 group shrink-0">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400 group-focus-within:text-indigo-700 transition-colors pointer-events-none z-10" size={16} />
              <input 
                type="date" 
                title="Data Inicial"
                className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-[11px] appearance-none dark:text-white font-bold"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
            <div className="relative flex-1 sm:w-44 group shrink-0">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400 group-focus-within:text-indigo-700 transition-colors pointer-events-none z-10" size={16} />
              <input 
                type="date" 
                title="Data Final"
                className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-[11px] appearance-none dark:text-white font-bold"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={clearDateFilter}
                className="p-2.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors shrink-0"
                title="Limpar filtros"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid de Promoções */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPromos.length === 0 ? (
          <div className="col-span-full py-24 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="bg-slate-50 dark:bg-slate-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Search className="text-slate-200 dark:text-slate-700" size={48} />
            </div>
            <h3 className="text-slate-800 dark:text-slate-200 font-black text-xl tracking-tight">Nenhuma oferta por aqui</h3>
            <p className="text-slate-400 dark:text-slate-500 text-sm max-w-xs mx-auto mt-3 font-medium text-center px-4">Não encontramos resultados para sua busca ou período selecionado.</p>
          </div>
        ) : (
          filteredPromos.map((promo) => {
            const category = state.categories.find(c => c.name === promo.mainCategoryId || c.id === promo.mainCategoryId);
            const isDeleting = deletingId === promo.id;
            const isSending = sendingId === promo.id;
            const creationDate = promo.createdAt ? new Date(promo.createdAt) : new Date();

            return (
              <div key={promo.id} className={`bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 group transition-all duration-500 hover:shadow-2xl hover:translate-y-[-8px] hover:border-indigo-100 dark:hover:border-indigo-900 ${isDeleting ? 'opacity-50 pointer-events-none scale-95' : ''}`}>
                <div className="relative h-60 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img src={promo.imageUrl} className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" alt={promo.title} />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                  
                  <div className="absolute top-5 left-5">
                    <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl backdrop-blur-md border border-white/20 ${category?.color || 'bg-slate-600/80'}`}>
                      {category?.name || 'Geral'}
                    </span>
                  </div>

                  <div className="absolute bottom-5 left-5 z-10 flex flex-col gap-1.5">
                    <span className="text-[9px] font-black text-white/80 uppercase tracking-widest drop-shadow-md">Data do Post</span>
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-2xl text-[11px] font-black shadow-2xl border border-white/20">
                      <Clock size={14} className="animate-pulse" />
                      {creationDate.toLocaleDateString('pt-BR')} 
                      <span className="opacity-50 mx-1">|</span>
                      {creationDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="p-7 space-y-6">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight h-10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300 tracking-tight">{promo.title}</h4>
                    <div className="flex items-center justify-between mt-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Preço Promo</span>
                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                          <span className="text-base font-extrabold mr-1">R$</span> 
                          {promo.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-black text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-inner">#{promo.id}</span>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => setPreviewPromo(promo)} className="p-3 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-2xl transition-all active:scale-90" title="Ver Preview Mobile">
                        <Eye size={20} />
                      </button>
                      <button onClick={() => { setEditingPromo(promo); setIsModalOpen(true); }} className="p-3 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/40 rounded-2xl transition-all active:scale-90" title="Editar Informações">
                        <Edit3 size={20} />
                      </button>
                      <button disabled={isDeleting} onClick={() => deletePromo(promo.id)} className="p-3 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-2xl transition-all active:scale-90" title="Excluir Oferta">
                        {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                      </button>
                    </div>
                    <button 
                      onClick={() => handleSend(promo)}
                      disabled={isSending}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-[11px] font-black hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-all shadow-xl active:scale-95 uppercase tracking-widest min-w-[120px]"
                    >
                      {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      {isSending ? 'Enviando' : 'Enviar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modais */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
            <div className="px-12 py-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                  {editingPromo?.id && !editingPromo.id.toString().startsWith('temp-') ? 'Editar Promo' : 'Publicar'}
                </h2>
                <p className="text-slate-500 dark:text-slate-500 font-black text-[10px] mt-1 uppercase tracking-widest">Painel de Curadoria de Conteúdo</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-500 p-4 bg-white dark:bg-slate-800 rounded-[2rem] shadow-lg transition-all active:scale-90 border border-slate-100 dark:border-slate-700">
                <X size={28} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-12 grid grid-cols-1 md:grid-cols-2 gap-10 overflow-y-auto">
              <div className="space-y-8">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 group-focus-within:text-indigo-500 transition-colors">Título Comercial*</label>
                  <input required type="text" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold dark:text-white" placeholder="iPhone 15 Pro 128GB" value={editingPromo?.title || ''} onChange={e => setEditingPromo(prev => ({ ...prev, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Valor (R$)*</label>
                    <input required type="number" step="0.01" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-black dark:text-white text-xl" placeholder="0,00" value={editingPromo?.price || ''} onChange={e => setEditingPromo(prev => ({ ...prev, price: Number(e.target.value) }))} />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Cupom</label>
                    <input type="text" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter" placeholder="Cupom..." value={editingPromo?.coupon || ''} onChange={e => setEditingPromo(prev => ({ ...prev, coupon: e.target.value }))} />
                  </div>
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Link da Oferta*</label>
                  <input required type="url" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white font-medium text-xs" placeholder="https://..." value={editingPromo?.link || ''} onChange={e => setEditingPromo(prev => ({ ...prev, link: e.target.value }))} />
                </div>
              </div>
              
              <div className="space-y-8">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Link da Imagem</label>
                  <input type="url" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white text-xs" placeholder="https://..." value={editingPromo?.imageUrl || ''} onChange={e => setEditingPromo(prev => ({ ...prev, imageUrl: e.target.value }))} />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Categoria*</label>
                  <select required className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-black appearance-none cursor-pointer dark:text-white uppercase tracking-widest" value={editingPromo?.mainCategoryId || ''} onChange={e => setEditingPromo(prev => ({ ...prev, mainCategoryId: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {state.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="pt-10 flex justify-end gap-5 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 rounded-3xl transition-all">Descartar</button>
                  <button type="submit" disabled={isSaving} className="px-12 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-3xl hover:bg-indigo-700 flex items-center gap-4 shadow-2xl shadow-indigo-600/40 transition-all active:scale-95 disabled:opacity-50">
                    {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                    Finalizar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsPage;
