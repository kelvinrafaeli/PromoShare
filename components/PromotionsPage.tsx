
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Search, Filter, Trash2, Edit3, 
  Eye, Clock, Save, 
  Users, Loader2, Calendar, ArrowRight, X, AlertTriangle, Upload,
  Smartphone, MessageSquare
} from 'lucide-react';
import { AppState, Promotion } from '../types';
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
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setEditingPromo(null);
        setPreviewPromo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isModalOpen || previewPromo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen, previewPromo]);

  const filteredPromos = useMemo(() => {
    let list = state.promotions;
    if (state.user?.role !== 'ADMIN') list = list.filter(p => p.ownerId === state.user?.id);
    if (searchTerm) list = list.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione apenas imagens.');
      return;
    }
    setIsUploading(true);
    try {
      const publicUrl = await api.uploadImage(file);
      setEditingPromo(prev => ({ ...prev, imageUrl: publicUrl }));
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const defaultCategory = state.categories.length > 0 ? state.categories[0].id : 'geral';
    if (!editingPromo?.title || !editingPromo?.price) {
      alert('Preencha título e preço.');
      return;
    }
    setIsSaving(true);
    const promoToSave: Promotion = {
      id: editingPromo.id || `temp-${Date.now()}`,
      title: editingPromo.title,
      price: Number(editingPromo.price),
      link: editingPromo.link || '',
      imageUrl: editingPromo.imageUrl || 'https://picsum.photos/400/300',
      mainCategoryId: editingPromo.mainCategoryId || defaultCategory,
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
          ? prev.promotions.map(p => p.id === editingPromo.id ? { ...savedPromo, targetGroupIds: promoToSave.targetGroupIds } : p)
          : [{ ...savedPromo, targetGroupIds: promoToSave.targetGroupIds }, ...prev.promotions.filter(p => p.id !== promoToSave.id)];
        return { ...prev, promotions: newList };
      });
      if (promoToSave.targetGroupIds.length > 0) {
        try { await api.sendToWebhook(savedPromo); } catch (err) {}
      }
      setIsModalOpen(false);
      setEditingPromo(null);
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const deletePromo = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await api.deletePromotion(id);
      setState(prev => ({ ...prev, promotions: prev.promotions.filter(p => p.id !== id) }));
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Busca e Filtros - Melhorado para Mobile */}
        <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative w-full lg:flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar ofertas..." 
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-all text-sm font-bold dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => { setEditingPromo({ mainCategoryId: state.categories[0]?.id || '', targetGroupIds: state.groups.map(g => g.id) }); setIsModalOpen(true); }}
              className="w-full lg:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 shrink-0"
            >
              <Plus size={20} />
              Nova Promo
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 w-full overflow-x-auto pb-1 no-scrollbar">
              <Calendar size={16} className="text-indigo-600 shrink-0" />
              <input type="date" className="bg-transparent border-none text-[11px] font-black uppercase dark:text-white outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <ArrowRight size={12} className="text-slate-300" />
              <input type="date" className="bg-transparent border-none text-[11px] font-black uppercase dark:text-white outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
              {(startDate || endDate) && <X size={16} className="text-red-500 cursor-pointer" onClick={() => {setStartDate(''); setEndDate('');}} />}
            </div>
          </div>
        </div>

        {/* Grid de Promoções */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredPromos.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
              <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Nenhuma oferta encontrada</p>
            </div>
          ) : (
            filteredPromos.map((promo) => (
              <div key={promo.id} className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 group transition-all duration-300 hover:shadow-xl flex flex-col h-full">
                <div className="relative h-48 md:h-56 overflow-hidden shrink-0">
                  <img src={promo.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={promo.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-[10px] text-white font-black">
                    <Clock size={12} />
                    {new Date(promo.createdAt || Date.now()).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h4 className="font-bold text-slate-800 dark:text-white line-clamp-2 leading-tight mb-4 text-sm md:text-base">{promo.title}</h4>
                  <div className="mt-auto space-y-4">
                    <div className="flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Valor Oferta</span>
                        <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                          <span className="text-xs mr-0.5">R$</span>{promo.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-indigo-100 dark:border-indigo-900/50">
                        <Users size={12} />
                        {promo.targetGroupIds.length} Canais
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button onClick={() => setPreviewPromo(promo)} className="flex items-center justify-center gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-400 hover:text-indigo-600 rounded-xl transition-all active:scale-95 font-black text-[9px] uppercase tracking-widest border border-slate-100 dark:border-slate-700">
                        <Eye size={16} /> Preview
                      </button>
                      <button onClick={() => { setEditingPromo(promo); setIsModalOpen(true); }} className="flex items-center justify-center gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-slate-600 dark:text-slate-400 hover:text-amber-600 rounded-xl transition-all active:scale-95 font-black text-[9px] uppercase tracking-widest border border-slate-100 dark:border-slate-700">
                        <Edit3 size={16} /> Editar
                      </button>
                      <button 
                        disabled={deletingId === promo.id}
                        onClick={() => deletePromo(promo.id)}
                        className={`col-span-2 flex items-center justify-center gap-2 p-3 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest border ${
                          confirmDeleteId === promo.id 
                            ? 'bg-red-600 text-white border-red-600 animate-pulse' 
                            : 'text-slate-400 hover:text-red-600 hover:bg-red-50 border-slate-100 dark:border-slate-800'
                        }`}
                      >
                        {deletingId === promo.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        {confirmDeleteId === promo.id ? 'Confirmar Exclusão?' : 'Excluir'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Edição/Criação - Estilo Mobile Otimizado */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => { setIsModalOpen(false); setEditingPromo(null); }}
        >
          <div 
            className="bg-white dark:bg-slate-900 w-full h-full md:h-auto md:max-w-4xl md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 md:px-12 py-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
              <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                {editingPromo?.id && !editingPromo.id.toString().startsWith('temp-') ? 'Editar Promo' : 'Publicar Promo'}
              </h2>
              <p className="text-slate-400 font-black text-[9px] md:text-[10px] uppercase tracking-widest mt-1">Clique fora para descartar</p>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-32 md:pb-12 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Título Comercial*</label>
                      <input required type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold dark:text-white" placeholder="Ex: iPhone 15 Pro Max" value={editingPromo?.title || ''} onChange={e => setEditingPromo(prev => ({ ...prev, title: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Preço (R$)*</label>
                        <input required type="number" step="0.01" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black dark:text-white" value={editingPromo?.price || ''} onChange={e => setEditingPromo(prev => ({ ...prev, price: Number(e.target.value) }))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cupom</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-indigo-600 uppercase" placeholder="OPCIONAL" value={editingPromo?.coupon || ''} onChange={e => setEditingPromo(prev => ({ ...prev, coupon: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Link da Oferta*</label>
                      <input required type="url" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs dark:text-white" placeholder="https://..." value={editingPromo?.link || ''} onChange={e => setEditingPromo(prev => ({ ...prev, link: e.target.value }))} />
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Imagem do Produto</label>
                      <div className="flex gap-2">
                        <input type="url" className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs dark:text-white" placeholder="URL da imagem..." value={editingPromo?.imageUrl || ''} onChange={e => setEditingPromo(prev => ({ ...prev, imageUrl: e.target.value }))} />
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="px-5 bg-indigo-50 dark:bg-slate-800 text-indigo-600 rounded-2xl border-2 border-slate-100 dark:border-slate-700">
                          {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Destinos de Envio*</label>
                      <div className="grid grid-cols-1 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700">
                        {state.groups.map(group => (
                          <label key={group.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl cursor-pointer border border-slate-50 dark:border-slate-800 shadow-sm">
                            <input 
                              type="checkbox" 
                              className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-200"
                              checked={editingPromo?.targetGroupIds?.includes(group.id) || false}
                              onChange={e => {
                                const current = editingPromo?.targetGroupIds || [];
                                const updated = e.target.checked ? [...current, group.id] : current.filter(id => id !== group.id);
                                setEditingPromo(prev => ({ ...prev, targetGroupIds: updated }));
                              }}
                            />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-700 dark:text-white uppercase tracking-tighter">{group.name}</span>
                              <span className="text-[9px] font-black text-slate-400 uppercase">{group.platform}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 p-6 md:px-8 md:py-6 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex gap-4 z-40 fixed md:relative bottom-0 left-0 right-0">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingPromo(null); }} className="flex-1 md:flex-none px-8 py-4 text-slate-400 font-black uppercase tracking-widest text-xs">Sair</button>
                <button type="submit" disabled={isSaving} className="flex-[2] md:flex-none md:px-12 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 flex items-center justify-center gap-3 shadow-2xl shadow-indigo-600/40 active:scale-95 disabled:opacity-50 text-xs">
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  Salvar e Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Preview Mobile - Melhorado */}
      {previewPromo && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300 cursor-pointer overflow-y-auto"
          onClick={() => setPreviewPromo(null)}
        >
          <div 
            className="relative w-full max-w-sm flex flex-col items-center py-4 md:py-10 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Legend for Closing */}
            <div className="mb-4 text-white/40 text-[10px] font-black uppercase tracking-widest animate-pulse">
              Toque fora para sair
            </div>

            {/* Smartphone Shell - Escalonado para Mobile */}
            <div className="w-[280px] sm:w-[320px] h-[580px] sm:h-[640px] bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] border-[6px] sm:border-[8px] border-slate-800 shadow-2xl overflow-hidden flex flex-col relative shrink-0">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 sm:w-32 h-5 sm:h-6 bg-slate-800 rounded-b-2xl z-20"></div>
              <div className="bg-slate-800 h-8 sm:h-10 flex items-center justify-between px-6 sm:px-8 shrink-0">
                <span className="text-white/50 text-[10px] font-bold">12:00</span>
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full border border-white/20 bg-white/20"></div>
                </div>
              </div>

              <div className="flex-1 bg-[#0e1621] overflow-y-auto p-4 flex flex-col gap-4">
                <div className="bg-[#182533] p-0.5 rounded-2xl shadow-lg border border-white/5 max-w-[90%] self-start animate-in slide-in-from-left duration-500">
                  <div className="rounded-xl overflow-hidden">
                    <img src={previewPromo.imageUrl} alt="Preview" className="w-full h-40 sm:h-48 object-cover" />
                    <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                      <p className="text-white font-bold leading-tight text-sm sm:text-base">🚀 {previewPromo.title}</p>
                      <p className="text-[#64b5f6] font-black text-lg sm:text-xl">R$ {previewPromo.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      {previewPromo.coupon && (
                        <div className="bg-[#242f3d] p-2 sm:p-3 rounded-xl border border-white/5">
                          <p className="text-white/50 text-[8px] sm:text-[9px] uppercase font-bold tracking-widest mb-1">Cupom</p>
                          <p className="text-[#ffb74d] font-mono font-black text-base sm:text-lg">{previewPromo.coupon}</p>
                        </div>
                      )}
                      <div className="bg-indigo-600 text-white py-3 rounded-xl text-center font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                        🔥 COMPRAR AGORA
                      </div>
                    </div>
                  </div>
                  <div className="px-3 pb-2 flex justify-end">
                    <span className="text-white/30 text-[9px]">12:00 PM</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#17212b] h-14 sm:h-16 p-2 sm:p-3 flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-slate-800 flex items-center justify-center text-white/20"><Smartphone size={18} /></div>
                <div className="flex-1 bg-[#0e1621] h-8 sm:h-10 rounded-full px-4 flex items-center text-white/20 text-[10px] sm:text-xs italic truncate">Escrever...</div>
                <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white"><MessageSquare size={16} /></div>
              </div>
            </div>

            <div className="mt-6 text-center space-y-2 px-6">
              <h3 className="text-white font-black text-lg tracking-tight">Preview Social</h3>
              <p className="text-white/30 text-[10px] font-medium max-w-xs mx-auto uppercase tracking-widest">
                Toque em qualquer área escura para sair do simulador
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PromotionsPage;
