
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

  // Escutar tecla ESC para fechar modais
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

  // Bloquear scroll do body quando modal estiver aberto
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    setIsUploading(true);
    try {
      const publicUrl = await api.uploadImage(file);
      setEditingPromo(prev => ({ ...prev, imageUrl: publicUrl }));
    } catch (error: any) {
      alert(`Erro no upload da imagem: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const defaultCategory = state.categories.length > 0 ? state.categories[0].id : 'geral';
    const categoryToUse = editingPromo?.mainCategoryId || defaultCategory;

    if (!editingPromo?.title || !editingPromo?.price) {
      alert('Por favor, preencha o título e preço.');
      return;
    }

    setIsSaving(true);
    const promoToSave: Promotion = {
      id: editingPromo.id || `temp-${Date.now()}`,
      title: editingPromo.title,
      price: Number(editingPromo.price),
      link: editingPromo.link || '',
      imageUrl: editingPromo.imageUrl || 'https://picsum.photos/400/300',
      mainCategoryId: categoryToUse,
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
        try {
          addLog('Automation', 'INFO', 'Iniciando envio automático para webhook...');
          await api.sendToWebhook(savedPromo);
          addLog('Automation', 'SUCCESS', 'Promoção salva e enviada com sucesso.');
        } catch (webhookError: any) {
          console.error('Falha no webhook automático:', webhookError);
          alert(`Oferta salva no banco, mas o envio para o Webhook falhou.\n\nERRO: ${webhookError.message}`);
        }
      }
      
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
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    setDeletingId(id);
    setConfirmDeleteId(null);

    try {
      await api.deletePromotion(id);
      setState(prev => ({
        ...prev,
        promotions: prev.promotions.filter(p => p.id !== id)
      }));
    } catch (error: any) {
      alert(`Erro ao excluir promoção: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <>
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
              onClick={() => { 
                setEditingPromo({ 
                  mainCategoryId: state.categories[0]?.id || state.categories[0]?.name || '', 
                  targetGroupIds: state.groups.map(g => g.id) 
                }); 
                setIsModalOpen(true); 
              }}
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
              const isDeleting = deletingId === promo.id;
              const isConfirming = confirmDeleteId === promo.id;
              const creationDate = promo.createdAt ? new Date(promo.createdAt) : new Date();

              return (
                <div key={promo.id} className={`bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 group transition-all duration-500 hover:shadow-2xl hover:translate-y-[-8px] hover:border-indigo-100 dark:hover:border-indigo-900 flex flex-col h-full ${isDeleting ? 'opacity-50 pointer-events-none scale-95' : ''}`}>
                  <div className="relative h-60 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                    <img src={promo.imageUrl} className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" alt={promo.title} />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                    
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

                  <div className="p-7 flex flex-col flex-1">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 dark:text-white line-clamp-2 leading-tight h-10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300 tracking-tight">{promo.title}</h4>
                      <div className="flex items-center justify-between mt-6">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 truncate">Preço Promo</span>
                          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter truncate">
                            <span className="text-sm font-extrabold mr-1">R$</span> 
                            {promo.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono font-black text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/80 px-2 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-inner shrink-0">#{promo.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mt-6">
                      <Users size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="text-[10px] font-black text-slate-50 dark:text-slate-400 uppercase tracking-widest truncate">
                        {promo.targetGroupIds.length === 0 ? 'Sem canais' : `${promo.targetGroupIds.length} ${promo.targetGroupIds.length === 1 ? 'canal' : 'canais'}`}
                      </span>
                    </div>

                    <div className="pt-5 mt-6 border-t border-slate-100 dark:border-slate-800">
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setPreviewPromo(promo)} 
                          className="flex items-center justify-center gap-1.5 p-2.5 sm:p-3 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl transition-all active:scale-95 border border-slate-100 dark:border-slate-800 font-black text-[9px] uppercase tracking-widest"
                        >
                          <Eye size={16} className="shrink-0" />
                          <span className="truncate">Preview</span>
                        </button>
                        <button 
                          onClick={() => { setEditingPromo(promo); setIsModalOpen(true); }} 
                          className="flex items-center justify-center gap-1.5 p-2.5 sm:p-3 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/40 rounded-xl transition-all active:scale-95 border border-slate-100 dark:border-slate-800 font-black text-[9px] uppercase tracking-widest"
                        >
                          <Edit3 size={16} className="shrink-0" />
                          <span className="truncate">Editar</span>
                        </button>
                        <button 
                          disabled={isDeleting} 
                          onClick={() => deletePromo(promo.id)} 
                          className={`col-span-2 flex items-center justify-center gap-2 p-2.5 sm:p-3 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest border truncate ${
                            isConfirming 
                              ? 'bg-red-600 text-white border-red-600 animate-pulse shadow-lg shadow-red-600/30' 
                              : 'text-slate-400 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-slate-100 dark:border-slate-800'
                          }`}
                        >
                          {isDeleting ? (
                            <Loader2 size={16} className="animate-spin shrink-0" />
                          ) : isConfirming ? (
                            <>
                              <AlertTriangle size={14} className="shrink-0" />
                              <span className="truncate">Confirmar Exclusão?</span>
                            </>
                          ) : (
                            <>
                              <Trash2 size={16} className="shrink-0" />
                              <span className="truncate">Excluir Oferta</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de Edição/Criação */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => { setIsModalOpen(false); setEditingPromo(null); }}
        >
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-8 sm:px-12 py-6 sm:py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 z-20">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                  {editingPromo?.id && !editingPromo.id.toString().startsWith('temp-') ? 'Editar Promo' : 'Publicar'}
                </h2>
                <p className="text-slate-500 dark:text-slate-500 font-black text-[10px] mt-1 uppercase tracking-widest">Painel de Curadoria de Conteúdo</p>
              </div>
              <button onClick={() => { setIsModalOpen(false); setEditingPromo(null); }} className="text-slate-400 hover:text-red-600 dark:hover:text-red-500 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl sm:rounded-[2rem] shadow-sm transition-all active:scale-90 border border-slate-100 dark:border-slate-700">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-8 sm:p-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
                  <div className="space-y-6 sm:space-y-8">
                    <div className="group">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 group-focus-within:text-indigo-500 transition-colors">Título Comercial*</label>
                      <input required type="text" className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.2rem] sm:rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold dark:text-white" placeholder="iPhone 15 Pro 128GB" value={editingPromo?.title || ''} onChange={e => setEditingPromo(prev => ({ ...prev, title: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:gap-6">
                      <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Valor (R$)*</label>
                        <input required type="number" step="0.01" className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.2rem] sm:rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-black dark:text-white text-lg sm:text-xl" placeholder="0,00" value={editingPromo?.price || ''} onChange={e => setEditingPromo(prev => ({ ...prev, price: Number(e.target.value) }))} />
                      </div>
                      <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Cupom</label>
                        <input type="text" className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.2rem] sm:rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter" placeholder="Cupom..." value={editingPromo?.coupon || ''} onChange={e => setEditingPromo(prev => ({ ...prev, coupon: e.target.value }))} />
                      </div>
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Link da Oferta*</label>
                      <input required type="url" className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.2rem] sm:rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white font-medium text-xs" placeholder="https://..." value={editingPromo?.link || ''} onChange={e => setEditingPromo(prev => ({ ...prev, link: e.target.value }))} />
                    </div>
                  </div>
                  
                  <div className="space-y-6 sm:space-y-8">
                    <div className="group">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Link da Imagem / Upload</label>
                      <div className="flex gap-2 sm:gap-3">
                        <input type="url" className="flex-1 px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.2rem] sm:rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white text-xs" placeholder="https://..." value={editingPromo?.imageUrl || ''} onChange={e => setEditingPromo(prev => ({ ...prev, imageUrl: e.target.value }))} />
                        
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-3 sm:px-4 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-[1.2rem] sm:rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-700 hover:bg-indigo-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center disabled:opacity-50"
                        >
                          {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                        </button>
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Users size={14} className="text-indigo-500" />
                        Canais de Destino*
                      </label>
                      <div className="grid grid-cols-1 gap-2 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/60 rounded-[1.2rem] sm:rounded-[1.5rem] border border-slate-100 dark:border-slate-700 shadow-inner">
                        {state.groups.length > 0 ? state.groups.map(group => (
                          <label key={group.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-50 dark:border-slate-800 shadow-sm group/item">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                              checked={editingPromo?.targetGroupIds?.includes(group.id) || false}
                              onChange={e => {
                                const current = editingPromo?.targetGroupIds || [];
                                const updated = e.target.checked ? [...current, group.id] : current.filter(id => id !== group.id);
                                setEditingPromo(prev => ({ ...prev, targetGroupIds: updated }));
                              }}
                            />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">{group.name}</span>
                              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase opacity-70">{group.platform}</span>
                            </div>
                          </label>
                        )) : (
                          <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black py-6 italic">Cadastre Canais primeiro na aba "Grupos".</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 px-6 sm:px-8 py-5 sm:py-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3 sm:gap-5 z-20">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingPromo(null); }} className="px-6 sm:px-10 py-3 sm:py-4 text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 rounded-[1.2rem] sm:rounded-3xl transition-all text-xs">Descartar</button>
                <button type="submit" disabled={isSaving} className="px-8 sm:px-12 py-3 sm:py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-[1.2rem] sm:rounded-3xl hover:bg-indigo-700 flex items-center gap-3 sm:gap-4 shadow-2xl shadow-indigo-600/40 transition-all active:scale-95 disabled:opacity-50 text-xs">
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  Salvar e Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Preview Mobile */}
      {previewPromo && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300 cursor-pointer overflow-y-auto"
          onClick={() => setPreviewPromo(null)}
        >
          <div 
            className="relative w-full max-w-sm flex flex-col items-center py-10 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão de fechar mais acessível e visível dentro da área segura */}
            <button 
              onClick={() => setPreviewPromo(null)}
              className="absolute top-2 right-4 sm:-right-16 sm:top-0 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all border border-white/20 z-[120]"
            >
              <X size={24} />
            </button>

            {/* Smartphone Shell */}
            <div className="w-[280px] sm:w-[320px] h-[560px] sm:h-[640px] bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] border-[6px] sm:border-[8px] border-slate-800 shadow-2xl overflow-hidden flex flex-col relative shrink-0">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 sm:w-32 h-5 sm:h-6 bg-slate-800 rounded-b-2xl z-20"></div>
              
              {/* App Status Bar Mockup */}
              <div className="bg-slate-800 h-8 sm:h-10 flex items-center justify-between px-6 sm:px-8 shrink-0">
                <span className="text-white/50 text-[10px] font-bold">12:00</span>
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full border border-white/20"></div>
                  <div className="w-2.5 h-2.5 rounded-full border border-white/20 bg-white/20"></div>
                </div>
              </div>

              {/* Chat View */}
              <div className="flex-1 bg-[#0e1621] overflow-y-auto p-4 flex flex-col gap-4">
                <div className="bg-[#182533] p-0.5 rounded-2xl shadow-lg border border-white/5 max-w-[90%] self-start animate-in slide-in-from-left duration-500">
                  {/* Message Content */}
                  <div className="rounded-xl overflow-hidden">
                    <img src={previewPromo.imageUrl} alt="Preview" className="w-full h-40 sm:h-48 object-cover" />
                    <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                      <p className="text-white font-bold leading-tight text-sm sm:text-base">
                        🚀 {previewPromo.title}
                      </p>
                      <p className="text-[#64b5f6] font-black text-lg sm:text-xl">
                        R$ {previewPromo.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {previewPromo.coupon && (
                        <div className="bg-[#242f3d] p-2 sm:p-3 rounded-xl border border-white/5">
                          <p className="text-white/50 text-[8px] sm:text-[9px] uppercase font-bold tracking-widest mb-1">Cupom de Desconto</p>
                          <p className="text-[#ffb74d] font-mono font-black text-base sm:text-lg">{previewPromo.coupon}</p>
                        </div>
                      )}
                      <div className="flex flex-col gap-2 pt-1 sm:pt-2">
                        <div className="bg-indigo-600 text-white py-2.5 sm:py-3 rounded-xl text-center font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                          🔥 COMPRAR AGORA
                        </div>
                        <p className="text-white/40 text-[8px] sm:text-[9px] text-center italic">Clique no botão acima para abrir a oferta</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 pb-2 flex justify-end">
                    <span className="text-white/30 text-[9px]">12:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Input Bar Mockup */}
              <div className="bg-[#17212b] h-14 sm:h-16 p-2 sm:p-3 flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-slate-800 flex items-center justify-center text-white/20">
                  <Smartphone size={18} />
                </div>
                <div className="flex-1 bg-[#0e1621] h-8 sm:h-10 rounded-full px-4 flex items-center text-white/20 text-[10px] sm:text-xs italic truncate">
                  Visualizando preview...
                </div>
                <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                  <MessageSquare size={16} />
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 sm:mt-8 text-center space-y-1 sm:space-y-2 px-6">
              <h3 className="text-white font-black text-lg sm:text-xl tracking-tight flex items-center justify-center gap-3">
                <Smartphone size={20} className="text-indigo-400" />
                Simulador Mobile
              </h3>
              <p className="text-white/50 text-[10px] sm:text-xs font-medium max-w-xs mx-auto">
                Clique em qualquer lugar fora para fechar ou use a tecla ESC.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PromotionsPage;
