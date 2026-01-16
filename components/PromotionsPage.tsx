
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredPromos = useMemo(() => {
    let list = state.promotions;
    
    // Filtro por permissão (Admin vê tudo, User vê as suas)
    if (state.user?.role !== 'ADMIN') {
      list = list.filter(p => p.ownerId === state.user?.id);
    }
    
    // Filtro por busca de texto
    if (searchTerm) {
      list = list.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por intervalo de datas
    if (startDate || endDate) {
      list = list.filter(p => {
        if (!p.createdAt) return false;
        const pDate = p.createdAt.split('T')[0]; // Pega apenas YYYY-MM-DD
        
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
    <div className="space-y-6">
      {/* Filtros e Busca */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar pelo título da promoção..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setEditingPromo({ mainCategoryId: state.categories[0]?.name || '', targetGroupIds: [] }); setIsModalOpen(true); }}
            className="w-full lg:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-600/25 active:scale-95"
          >
            <Plus size={20} />
            Nova Promoção
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 border-t border-slate-50">
          <div className="flex items-center gap-2 text-slate-500 min-w-max">
            <Filter size={16} className="text-indigo-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Filtrar por Período:</span>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-44">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input 
                type="date" 
                title="Data Inicial"
                className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs appearance-none"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <ArrowRight size={14} className="text-slate-300 shrink-0" />
            <div className="relative flex-1 sm:w-44">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input 
                type="date" 
                title="Data Final"
                className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs appearance-none"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={clearDateFilter}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                title="Limpar filtros de data"
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
          <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="text-slate-200" size={40} />
            </div>
            <h3 className="text-slate-800 font-bold text-lg">Nenhuma oferta encontrada</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2">Tente ajustar seus filtros ou termos de busca para encontrar o que procura.</p>
          </div>
        ) : (
          filteredPromos.map((promo) => {
            const category = state.categories.find(c => c.name === promo.mainCategoryId || c.id === promo.mainCategoryId);
            const isDeleting = deletingId === promo.id;
            const creationDate = promo.createdAt ? new Date(promo.createdAt) : new Date();

            return (
              <div key={promo.id} className={`bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 group transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px] ${isDeleting ? 'opacity-50 pointer-events-none scale-95' : ''}`}>
                <div className="relative h-52 overflow-hidden bg-slate-50">
                  <img src={promo.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={promo.title} />
                  
                  {/* Overlay Gradiente */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Badge de Categoria */}
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-white shadow-lg backdrop-blur-md ${category?.color || 'bg-slate-500/80'}`}>
                      {category?.name || 'Geral'}
                    </span>
                  </div>

                  {/* Badge de Data - Sempre Visível */}
                  <div className="absolute bottom-4 right-4 z-10">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl text-slate-800 text-[10px] font-bold shadow-sm border border-white/20">
                      <Clock size={12} className="text-indigo-500" />
                      {creationDate.toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-800 line-clamp-2 leading-tight h-10 group-hover:text-indigo-600 transition-colors">{promo.title}</h4>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Preço Oferta</span>
                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                          <span className="text-sm font-bold mr-0.5">R$</span> 
                          {promo.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-slate-300 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">ID: {promo.id}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-2">
                    <div className="flex gap-1">
                      <button onClick={() => setPreviewPromo(promo)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Ver Preview Mobile"><Eye size={18} /></button>
                      <button onClick={() => { setEditingPromo(promo); setIsModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Editar Informações"><Edit3 size={18} /></button>
                      <button disabled={isDeleting} onClick={() => deletePromo(promo.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Excluir Oferta">
                        {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all shadow-md active:scale-95">
                      <Send size={14} />
                      Enviar
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  {editingPromo?.id && !editingPromo.id.toString().startsWith('temp-') ? 'Editar Promoção' : 'Nova Oferta'}
                </h2>
                <p className="text-slate-400 text-sm font-medium">Preencha os dados da oferta abaixo</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-3 bg-white rounded-full shadow-sm hover:shadow transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto">
              <div className="space-y-6">
                <div className="group">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-500 transition-colors">Título da Oferta*</label>
                  <input required type="text" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" placeholder="Ex: iPhone 15 Pro Max 256GB" value={editingPromo?.title || ''} onChange={e => setEditingPromo(prev => ({ ...prev, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Preço (R$)*</label>
                    <input required type="number" step="0.01" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" placeholder="0,00" value={editingPromo?.price || ''} onChange={e => setEditingPromo(prev => ({ ...prev, price: Number(e.target.value) }))} />
                  </div>
                  <div className="group">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cupom</label>
                    <input type="text" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-indigo-600" placeholder="Opcional" value={editingPromo?.coupon || ''} onChange={e => setEditingPromo(prev => ({ ...prev, coupon: e.target.value }))} />
                  </div>
                </div>
                <div className="group">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Link Direto da Oferta*</label>
                  <input required type="url" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="https://..." value={editingPromo?.link || ''} onChange={e => setEditingPromo(prev => ({ ...prev, link: e.target.value }))} />
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="group">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">URL da Imagem do Produto</label>
                  <input type="url" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="https://..." value={editingPromo?.imageUrl || ''} onChange={e => setEditingPromo(prev => ({ ...prev, imageUrl: e.target.value }))} />
                </div>
                <div className="group">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Categoria da Oferta*</label>
                  <select required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold appearance-none cursor-pointer" value={editingPromo?.mainCategoryId || ''} onChange={e => setEditingPromo(prev => ({ ...prev, mainCategoryId: e.target.value }))}>
                    <option value="">Selecione uma categoria...</option>
                    {state.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="pt-6 flex justify-end gap-4 border-t border-slate-50">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition-all active:scale-95">Descartar</button>
                  <button type="submit" disabled={isSaving} className="px-10 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 flex items-center gap-3 shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-70">
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    {editingPromo?.id && !editingPromo.id.toString().startsWith('temp-') ? 'Atualizar Promoção' : 'Publicar Oferta'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview WhatsApp Style */}
      {previewPromo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in zoom-in duration-300">
          <div className="bg-[#f0f2f5] w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-white/20">
            <div className="bg-[#00a884] p-5 flex items-center justify-between text-white shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Smartphone size={20}/>
                </div>
                <div>
                  <h3 className="font-bold text-sm">Visualização Mobile</h3>
                  <p className="text-[10px] opacity-80 font-medium">PromoShare Previewer</p>
                </div>
              </div>
              <button onClick={() => setPreviewPromo(null)} className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 bg-[#e5ddd5] min-h-[400px] relative">
              {/* WhatsApp Message Bubble */}
              <div className="bg-white p-3 rounded-2xl shadow-sm w-[92%] relative animate-in slide-in-from-left-4">
                {/* Image */}
                <div className="rounded-xl overflow-hidden mb-3">
                  <img src={previewPromo.imageUrl} className="w-full h-48 object-cover" alt="Preview" />
                </div>
                {/* Content */}
                <div className="text-[13px] leading-relaxed text-[#111b21] space-y-2">
                  <p><strong>🔥 {previewPromo.title}</strong></p>
                  <p className="text-[#1fa855] font-black text-lg mt-1">💰 R$ {previewPromo.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  
                  {previewPromo.coupon && (
                    <div className="bg-amber-50 border border-amber-100 p-2 rounded-lg flex items-center gap-2 mt-2">
                      <span className="text-amber-600 font-bold text-xs uppercase">Cupom:</span>
                      <span className="font-black text-slate-800 bg-amber-100 px-2 py-0.5 rounded">{previewPromo.coupon}</span>
                    </div>
                  )}
                  
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Link de Compra</p>
                    <p className="text-[#027eb5] break-all font-medium underline leading-snug">{previewPromo.link}</p>
                  </div>
                </div>
                
                {/* Timestamp */}
                <div className="text-[9px] text-slate-400 text-right mt-1 font-medium">
                  {new Date().getHours().toString().padStart(2, '0')}:{new Date().getMinutes().toString().padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsPage;
