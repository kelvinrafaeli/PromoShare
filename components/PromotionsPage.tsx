
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Search, Trash2, Eye, Save,
  Loader2, Upload, X, ImageIcon, Share2, ArrowLeft, MoreVertical, Smartphone, SquareCheck, Link, Edit3, RefreshCw, MessageCircle, Filter, Send, Zap
} from 'lucide-react';
import { AppState, Promotion } from '../types';
import { api } from '../services/supabase';
import { createPortal } from 'react-dom';

interface PromotionsPageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const PromotionsPage: React.FC<PromotionsPageProps> = ({ state, setState }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Partial<Promotion> | null>(null);
  const [previewPromo, setPreviewPromo] = useState<Promotion | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isUpdatingExternal, setIsUpdatingExternal] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'TELEGRAM' | 'WHATSAPP'>('all');
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [lastCheckedId, setLastCheckedId] = useState<string | null>(null);
  const [autoSendNotification, setAutoSendNotification] = useState<string | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const hasLoadedSettingsRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar configurações do banco de dados ao montar o componente
  useEffect(() => {
    const loadSettings = async () => {
      if (!state.user?.email) return;
      
      try {
        const settings = await api.getAutoSendSettings(state.user.email);
        setAutoSendEnabled(settings.enabled);
        setLastCheckedId(settings.lastCheckedId);
        hasLoadedSettingsRef.current = true;
        console.log('📥 Configurações carregadas:', settings);
      } catch (error: any) {
        console.error('Erro ao carregar configurações:', error.message);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, [state.user?.email]);

  // Salvar estado do auto-send no banco
  useEffect(() => {
    const saveAutoSendEnabled = async () => {
      // Só salva após ter carregado as configurações iniciais
      if (!state.user?.email || !hasLoadedSettingsRef.current) return;
      
      try {
        await api.updateAutoSendEnabled(state.user.email, autoSendEnabled);
        console.log('✅ Auto-send atualizado:', autoSendEnabled);
      } catch (error: any) {
        console.error('Erro ao salvar configuração:', error.message);
      }
    };

    saveAutoSendEnabled();
  }, [autoSendEnabled, state.user?.email]);

  // Salvar último ID verificado no banco
  useEffect(() => {
    const saveLastCheckedId = async () => {
      if (!state.user?.email || !lastCheckedId || !hasLoadedSettingsRef.current) return;
      
      try {
        await api.updateLastCheckedOfferId(state.user.email, lastCheckedId);
      } catch (error: any) {
        console.error('Erro ao salvar último ID:', error.message);
      }
    };

    saveLastCheckedId();
  }, [lastCheckedId, state.user?.id, isLoadingSettings]);

  // Selecionar todos os grupos por padrão ao abrir o modal de nova promoção
  useEffect(() => {
    if (isModalOpen) {
      if (!editingPromo?.id) {
        // Nova promoção: Seleciona todos
        setSelectedGroups(state.groups.map(g => g.id));
      } else {
        // Edição: Usa os grupos salvos (se houver) ou todos se estiver vazio (comportamento de fallback)
        setSelectedGroups(editingPromo.targetGroupIds && editingPromo.targetGroupIds.length > 0
          ? editingPromo.targetGroupIds
          : state.groups.map(g => g.id));
      }
    }
  }, [isModalOpen, editingPromo?.id, state.groups]);

  // Bloquear scroll do body quando modal ou preview estiver aberto
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
    if (searchTerm) list = list.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    return list;
  }, [state.promotions, searchTerm]);

  const displayGroups = useMemo(() => {
    let list = state.groups;
    if (platformFilter !== 'all') {
      list = list.filter(g => g.platform === platformFilter);
    }
    if (groupSearch) {
      list = list.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()));
    }
    return list;
  }, [state.groups, platformFilter, groupSearch]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const publicUrl = await api.uploadImage(file);
      setEditingPromo(prev => ({ ...prev, imageUrl: publicUrl }));
    } catch (error: any) {
      alert(`Falha no upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de campos obrigatórios
    if (!editingPromo?.title || !editingPromo?.price) {
      alert('Preencha título e preço.');
      return;
    }

    setIsSaving(true);
    try {
      const promoToSave = {
        ...editingPromo,
        id: editingPromo.id || `temp-${Date.now()}`,
        targetGroupIds: selectedGroups,
        ownerId: state.user?.id, // Garante que o ID do usuário seja passado
        status: 'SENT',
        mainCategoryId: null // Envia null para categoria
      } as unknown as Promotion;

      const savedPromo = await api.savePromotion(promoToSave, state.groups);

      // Atualiza o estado local para refletir a mudança imediatamente
      savedPromo.targetGroupIds = selectedGroups;

      setState(prev => ({
        ...prev,
        promotions: editingPromo.id
          ? prev.promotions.map(p => p.id === editingPromo.id ? savedPromo : p)
          : [savedPromo, ...prev.promotions]
      }));

      setIsModalOpen(false);
      setEditingPromo(null);
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta promoção?')) return;
    try {
      await api.deletePromotion(id);
      setState(prev => ({ ...prev, promotions: prev.promotions.filter(p => p.id !== id) }));
    } catch (error: any) {
      alert(error.message);
    }
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar ofertas..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Toggle de Envio Automático */}
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
          {isLoadingSettings ? (
            <Loader2 size={18} className="text-slate-400 animate-spin" />
          ) : (
            <Zap size={18} className={autoSendEnabled ? 'text-emerald-500' : 'text-slate-400'} />
          )}
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            Envio Automático
          </span>
          <button
            onClick={() => setAutoSendEnabled(!autoSendEnabled)}
            disabled={isLoadingSettings}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              autoSendEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
            } ${isLoadingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={autoSendEnabled ? 'Desativar envio automático' : 'Ativar envio automático'}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                autoSendEnabled ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        <div className="flex w-full md:w-auto gap-2">
          <button
            onClick={async () => {
              if (autoSendEnabled) {
                alert('Modo automático está ativo. Desative-o primeiro para buscar manualmente.');
                return;
              }
              
              setIsUpdatingExternal(true);
              try {
                console.log('🔄 Buscando última oferta...');
                const externalData = await api.fetchExternalProduct();
                console.log('✅ Produto encontrado:', externalData.title, 'ID:', externalData.externalId);

                // Verifica se já existe uma promoção com este externalId
                const existing = state.promotions.find(p => p.externalId === externalData.externalId);

                if (existing) {
                  alert(`✅ Esta promoção já foi inserida!\n\n"${existing.title}"`);
                } else {
                  // Abre o modal com os dados para edição/envio
                  setEditingPromo(externalData);
                  setIsModalOpen(true);
                }
              } catch (error: any) {
                console.error('❌ Erro:', error);
                alert(`Erro ao buscar produto: ${error.message}`);
              } finally {
                setIsUpdatingExternal(false);
              }
            }}
            disabled={isUpdatingExternal || autoSendEnabled}
            className={`flex-1 md:w-16 px-4 py-3.5 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${
              autoSendEnabled 
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed opacity-50' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95'
            }`}
            title={autoSendEnabled ? 'Desativado - Modo automático ativo' : 'Sincronizar última oferta'}
          >
            {isUpdatingExternal ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
          </button>
          <button
            onClick={() => { setEditingPromo({}); setIsModalOpen(true); }}
            className="flex-[3] md:w-auto px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Nova Promoção
          </button>
        </div>
      </div>

      {/* Badge de Status do Envio Automático */}
      {autoSendEnabled && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="relative">
            <Zap size={20} className="text-emerald-600 dark:text-emerald-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              Modo Automático Ativo (Backend Worker)
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              O servidor está verificando novas ofertas a cada 1 minuto e enviando automaticamente. Funciona 24/7, mesmo com navegador fechado.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPromos.map((promo) => {
          return (
            <div key={promo.id} className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm group">
              <div className="relative h-48 bg-slate-100 dark:bg-slate-800">
                {promo.imageUrl ? (
                  <img src={promo.imageUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-300"><ImageIcon size={40} /></div>
                )}
              </div>
              <div className="p-5">
                <h4 className="font-bold text-slate-800 dark:text-white line-clamp-2 mb-4 h-12">{promo.title}</h4>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-black text-indigo-600">R$ {promo.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPreviewPromo(promo)} className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:bg-indigo-50 transition-colors" title="Visualizar">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => { setEditingPromo(promo); setIsModalOpen(true); }} className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Editar">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => handleDelete(promo.id)} className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors" title="Excluir">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Nova Oferta</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={24} className="text-slate-400" /></button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-8">

              {/* Título em destaque */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Título do Produto</label>
                <input
                  required
                  placeholder="Ex: Smartphone Samsung Galaxy S23 Ultra 5G"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                  value={editingPromo?.title || ''}
                  onChange={e => setEditingPromo(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Coluna da Esquerda: Imagem */}
                <div className="md:col-span-5 space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-500 transition-colors group"
                  >
                    {editingPromo?.imageUrl ? (
                      <img src={editingPromo.imageUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="text-center p-6">
                        <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                          <Upload className="text-indigo-500" size={24} />
                        </div>
                        <span className="text-xs font-black uppercase text-slate-400 block">Carregar Imagem</span>
                      </div>
                    )}
                    {isUploading && <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center z-10"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />

                  {/* Campo de URL da Imagem */}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Link size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="Ou cole a URL da imagem aqui..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all border border-transparent focus:border-indigo-500"
                      value={editingPromo?.imageUrl || ''}
                      onChange={e => setEditingPromo(prev => ({ ...prev, imageUrl: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Coluna da Direita: Dados e Grupos */}
                <div className="md:col-span-7 flex flex-col gap-6">

                  {/* Linha de Preço e Cupom */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Preço (R$)</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-xl text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={editingPromo?.price || ''}
                        onChange={e => setEditingPromo(prev => ({ ...prev, price: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Cupom</label>
                      <input
                        placeholder="OPCIONAL"
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold uppercase tracking-widest text-emerald-500 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={editingPromo?.coupon || ''}
                        onChange={e => setEditingPromo(prev => ({ ...prev, coupon: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Link Produto</label>
                    <input
                      placeholder="https://..."
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-medium text-blue-500 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                      value={editingPromo?.link || ''}
                      onChange={e => setEditingPromo(prev => ({ ...prev, link: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Vendedor</label>
                      <input
                        placeholder="Ex: Amazon, Magalu..."
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                        value={editingPromo?.seller || ''}
                        onChange={e => setEditingPromo(prev => ({ ...prev, seller: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Parcelamento</label>
                      <input
                        placeholder="Ex: 10x sem juros"
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                        value={editingPromo?.installment || ''}
                        onChange={e => setEditingPromo(prev => ({ ...prev, installment: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div
                        onClick={() => setEditingPromo(prev => ({ ...prev, freeShipping: !prev?.freeShipping }))}
                        className={`w-10 h-6 rounded-full transition-colors relative ${editingPromo?.freeShipping ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingPromo?.freeShipping ? 'left-5' : 'left-1'}`} />
                      </div>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Frete Grátis</span>
                    </label>
                  </div>

                </div>
              </div>

              {/* Seleção de Grupos: Transmission Board - Full Width */}
              <div className="space-y-4 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden">
                {/* Header com Resumo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                      <Share2 size={18} className="text-indigo-500" />
                      Painel de Transmissão
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {selectedGroups.length} canais selecionados para disparo
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedGroups(state.groups.map(g => g.id))}
                      className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all active:scale-95"
                    >
                      Selecionar Tudo
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGroups([])}
                      className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Filtros e Busca */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Pesquise entre os 25+ canais disponíveis..."
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-indigo-500/20 transition-all dark:text-white"
                      value={groupSearch}
                      onChange={e => setGroupSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl gap-1">
                    {(['all', 'TELEGRAM', 'WHATSAPP'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPlatformFilter(p)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${platformFilter === p
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-lg'
                          : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        {p === 'all' ? 'Todos' : p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid de Alta Densidade */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {displayGroups.map(group => {
                    const isSelected = selectedGroups.includes(group.id);
                    return (
                      <div
                        key={group.id}
                        onClick={() => toggleGroup(group.id)}
                        className={`group relative p-4 rounded-[1.25rem] border-2 cursor-pointer transition-all flex flex-col justify-between h-24 ${isSelected
                          ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20 shadow-lg shadow-indigo-500/5'
                          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-indigo-200'
                          }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
                            {group.platform === 'TELEGRAM' ? (
                              <Send size={14} className={isSelected ? 'text-indigo-600' : 'text-slate-300'} />
                            ) : (
                              <MessageCircle size={14} className={isSelected ? 'text-emerald-500' : 'text-slate-300'} />
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 scale-110 rotate-0' : 'border-slate-200 dark:border-slate-700 -rotate-12'}`}>
                            {isSelected && <SquareCheck size={12} className="text-white" />}
                          </div>
                        </div>
                        <div className="overflow-hidden">
                          <p className={`text-[11px] font-black uppercase leading-tight line-clamp-2 transition-colors ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-400 group-hover:text-slate-500'}`}>
                            {group.name}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {displayGroups.length === 0 && (
                    <div className="col-span-full py-16 text-center opacity-40">
                      <Filter size={32} className="mx-auto mb-3 text-slate-300" />
                      <p className="text-[12px] font-black uppercase tracking-widest text-slate-400">Nenhum canal localizado</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-black uppercase text-[10px] text-slate-400">Cancelar</button>
                <button
                  type="button"
                  onClick={() => setPreviewPromo({
                    ...editingPromo,
                    id: editingPromo?.id || 'preview',
                    title: editingPromo?.title || 'Título de Exemplo',
                    price: editingPromo?.price || 0,
                    imageUrl: editingPromo?.imageUrl || '',
                    link: editingPromo?.link || '#',
                    status: 'DRAFT',
                    ownerId: state.user?.id || 'preview',
                    targetGroupIds: [],
                    secondaryCategoryIds: []
                  } as Promotion)}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                >
                  <Eye size={16} />
                  Visualizar
                </button>
                <button type="submit" disabled={isSaving || isUploading} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/30 flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all">
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Salvar e Enviar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Preview Telegram */}
      {previewPromo && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4" onClick={() => setPreviewPromo(null)}>
          <div className="w-full max-w-sm bg-[#0f1721] rounded-[3rem] border-[8px] border-slate-800 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-[#17212b] p-4 flex items-center gap-4 text-white">
              <ArrowLeft size={20} />
              <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center font-bold">P</div>
              <div className="flex-1">
                <h5 className="font-bold text-sm">PromoShare Chat</h5>
                <span className="text-[#64b5f6] text-[10px]">online</span>
              </div>
              <MoreVertical size={20} />
            </div>
            <div className="flex-1 p-4 overflow-y-auto flex flex-col justify-end">
              <div className="bg-[#182533] rounded-2xl overflow-hidden self-start max-w-[85%] shadow-xl">
                <img src={previewPromo.imageUrl} className="w-full aspect-square object-cover" />
                <div className="p-3 space-y-2 text-[14px] text-white">
                  <p>{previewPromo.title}</p>
                  <p className="font-bold">
                    {previewPromo.originalPrice ? <span className="text-xs line-through opacity-50 mr-2">R$ {previewPromo.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : null}
                    🔥 R$ {previewPromo.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {previewPromo.installment && <p className="text-xs opacity-70">💳 {previewPromo.installment}</p>}
                  {previewPromo.seller && <p className="text-xs opacity-70">🏪 Vendido por: {previewPromo.seller}</p>}
                  {previewPromo.freeShipping && <p className="text-xs text-emerald-400">✅ Frete Grátis</p>}
                  {previewPromo.coupon && <p className="uppercase">🤑 Cupom: {previewPromo.coupon}</p>}
                  <p className="text-[#64b5f6] underline break-all">{previewPromo.link}</p>
                  {previewPromo.extraInfo && <p className="text-[10px] italic opacity-60">{previewPromo.extraInfo}</p>}
                </div>
              </div>
            </div>
            <div className="bg-[#17212b] p-3 flex items-center gap-3">
              <Smartphone size={20} className="text-white/40" />
              <div className="flex-1 text-white/40 text-sm">Mensagem...</div>
              <Share2 size={20} className="text-white/40" />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast de Notificação de Envio Automático */}
      {autoSendNotification && createPortal(
        <div className="fixed top-6 right-6 z-[10001] animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[320px] border-2 border-emerald-400">
            <div className="p-2 bg-white/20 rounded-xl">
              <Send size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">Oferta Enviada Automaticamente!</p>
              <p className="text-xs opacity-90 line-clamp-1">{autoSendNotification}</p>
            </div>
            <button
              onClick={() => setAutoSendNotification(null)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PromotionsPage;
