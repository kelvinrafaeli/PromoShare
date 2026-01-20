
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Search, Filter, Send, Trash2, Edit3, 
  Eye, Clock, Save, 
  Users, Loader2, Calendar, ArrowRight, X, AlertTriangle, Upload
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
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bloquear scroll do body quando modal estiver aberto
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen]);

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

    // Validação básica
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
      // Limpa o input para permitir selecionar o mesmo arquivo novamente se necessário
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
      } else {
        addLog('Automation', 'INFO', 'Nenhum canal selecionado, salvando apenas no banco.');
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

  const handleSend = async (promo: Promotion) => {
    if (promo.targetGroupIds.length === 0) {
      alert('Esta promoção não tem canais de destino selecionados. Edite-a primeiro.');
      return;
    }
    setSendingId(promo.id);
    try {
      await api.sendToWebhook(promo);
      alert('Envio manual processado com sucesso!');
    } catch (error: any) {
      alert(`Falha no envio: ${error.message}`);
    } finally {
      setSendingId(null);
    }
  };

  const deletePromo = async (id: string) => {
    addLog('deletePromo', 'INFO', `Iniciando tentativa de exclusão da promoção ID: ${id}`);

    if (confirmDeleteId !== id) {
      addLog('deletePromo', 'INFO', `Primeiro clique para exclusão de ID: ${id}. Aguardando confirmação.`);
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    addLog('deletePromo', 'INFO', `Usuário confirmou a exclusão para ID: ${id}`);
    setDeletingId(id);
    setConfirmDeleteId(null);

    try {
      addLog('deletePromo', 'INFO', `Chamando api.deletePromotion para ID: ${id}`);
      await api.deletePromotion(id);
      addLog('deletePromo', 'SUCCESS', `Promoção ID: ${id} excluída do banco de dados.`);
      setState(prev => ({
        ...prev,
        promotions: prev.promotions.filter(p => p.id !== id)
      }));
      addLog('deletePromo', 'SUCCESS', `Estado da UI atualizado para exclusão da promoção ID: ${id}.`);
    } catch (error: any) {
      addLog('deletePromo', 'ERROR', `Erro ao excluir promoção ID: ${id}: ${error.message || error}`);
      alert(`Erro ao excluir promoção: ${error.message || 'Erro desconhecido'}`);
    } finally {
      addLog('deletePromo', 'INFO', `Finalizado operação de exclusão para promoção ID: ${id}.`);
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
                  // AQUI: Seleciona todos os grupos automaticamente usando o estado local
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
              const category = state.categories.find(c => c.name === promo.mainCategoryId || c.id === promo.mainCategoryId);
              const isDeleting = deletingId === promo.id;
              const isSending = sendingId === promo.id;
              const isConfirming = confirmDeleteId === promo.id;
              const creationDate = promo.createdAt ? new Date(promo.createdAt) : new Date();

              return (
                <div key={promo.id} className={`bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 group transition-all duration-500 hover:shadow-2xl hover:translate-y-[-8px] hover:border-indigo-100 dark:hover:border-indigo-900 ${isDeleting ? 'opacity-50 pointer-events-none scale-95' : ''}`}>
                  <div className="relative h-60 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img src={promo.imageUrl} className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" alt={promo.title} />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                    
                    {/* Badge de categoria removido aqui */}

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
                      <h4 className="font-bold text-slate-800 dark:text-white line-clamp-2 leading-tight h-10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300 tracking-tight">{promo.title}</h4>
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

                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {promo.targetGroupIds.length === 0 ? 'Sem canais' : `${promo.targetGroupIds.length} ${promo.targetGroupIds.length === 1 ? 'canal' : 'canais'}`}
                      </span>
                    </div>

                    <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => setPreviewPromo(promo)} className="p-3 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-2xl transition-all active:scale-90" title="Ver Preview Mobile">
                          <Eye size={20} />
                        </button>
                        <button onClick={() => { setEditingPromo(promo); setIsModalOpen(true); }} className="p-3 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/40 rounded-2xl transition-all active:scale-90" title="Editar Informações">
                          <Edit3 size={20} />
                        </button>
                        <button 
                          disabled={isDeleting} 
                          onClick={() => deletePromo(promo.id)} 
                          className={`p-3 rounded-2xl transition-all flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-tighter ${
                            isConfirming 
                              ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/30' 
                              : 'text-slate-400 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                          }`} 
                          title="Excluir Oferta"
                        >
                          {isDeleting ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : isConfirming ? (
                            <>
                              <AlertTriangle size={16} />
                              Confirmar?
                            </>
                          ) : (
                            <Trash2 size={20} />
                          )}
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
      </div>

      {/* Modais fora do container animado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
            {/* Header Fixo */}
            <div className="px-12 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 z-20">
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                  {editingPromo?.id && !editingPromo.id.toString().startsWith('temp-') ? 'Editar Promo' : 'Publicar'}
                </h2>
                <p className="text-slate-500 dark:text-slate-500 font-black text-[10px] mt-1 uppercase tracking-widest">Painel de Curadoria de Conteúdo</p>
              </div>
              <button onClick={() => { setIsModalOpen(false); setEditingPromo(null); }} className="text-slate-400 hover:text-red-600 dark:hover:text-red-500 p-4 bg-slate-50 dark:bg-slate-800 rounded-[2rem] shadow-sm transition-all active:scale-90 border border-slate-100 dark:border-slate-700">
                <X size={28} />
              </button>
            </div>
            
            {/* Corpo Scrollável */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Link da Imagem / Upload</label>
                      <div className="flex gap-3">
                        <input type="url" className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white text-xs" placeholder="https://..." value={editingPromo?.imageUrl || ''} onChange={e => setEditingPromo(prev => ({ ...prev, imageUrl: e.target.value }))} />
                        
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-4 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-700 hover:bg-indigo-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center disabled:opacity-50"
                          title="Fazer Upload de Imagem"
                        >
                          {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 ml-2">Cole o link direto ou faça upload de uma imagem.</p>
                    </div>

                    <div className="group">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Users size={14} className="text-indigo-500" />
                        Canais de Destino (Onde enviar)*
                      </label>
                      <div className="grid grid-cols-1 gap-2 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 shadow-inner">
                        {state.groups.length > 0 ? state.groups.map(group => (
                          <label key={group.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-50 dark:border-slate-800 shadow-sm group/item">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                              checked={editingPromo?.targetGroupIds?.includes(group.id) || false}
                              onChange={e => {
                                const current = editingPromo?.targetGroupIds || [];
                                const updated = e.target.checked 
                                  ? [...current, group.id] 
                                  : current.filter(id => id !== group.id);
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

              {/* Footer Fixo */}
              <div className="shrink-0 px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-5 z-20">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingPromo(null); }} className="px-10 py-4 text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 rounded-3xl transition-all">Descartar</button>
                <button type="submit" disabled={isSaving} className="px-12 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-3xl hover:bg-indigo-700 flex items-center gap-4 shadow-2xl shadow-indigo-600/40 transition-all active:scale-95 disabled:opacity-50">
                  {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                  Finalizar e Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PromotionsPage;
