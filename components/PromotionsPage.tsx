
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Search, Trash2, Eye, Save,
  Loader2, Upload, X, ImageIcon, Share2, ArrowLeft, MoreVertical, Smartphone, SquareCheck, Link, Edit3, RefreshCw, MessageCircle, Filter, Send, Zap, ChevronDown
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
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
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
    if (searchTerm) list = list.filter(p => p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return list;
  }, [state.promotions, searchTerm]);

  const getHeadline = (text: string) => {
    const line = text.split('\n').find(l => l.trim());
    return line || 'Oferta';
  };

  const getSnippet = (text: string) => text.replace(/\s+/g, ' ').trim();

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
    if (!editingPromo?.description) {
      alert('Preencha a descrição.');
      return;
    }

    setIsSaving(true);
    try {
      const promoToSave = {
        ...editingPromo,
        id: editingPromo.id || `temp-${Date.now()}`,
        targetGroupIds: selectedGroups,
        ownerId: state.user?.id, // Garante que o ID do usuário seja passado
        status: 'SENT'
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
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
          {isLoadingSettings ? (
            <Loader2 size={18} className="text-slate-400 animate-spin" />
          ) : (
            <Zap size={18} className={autoSendEnabled ? 'text-emerald-500' : 'text-slate-400'} />
          )}
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
            Auto
          </span>
          <button
            onClick={() => setAutoSendEnabled(!autoSendEnabled)}
            disabled={isLoadingSettings}
            className={`relative w-12 h-6 rounded-full transition-colors ${autoSendEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
              } ${isLoadingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={autoSendEnabled ? 'Desativar envio automático' : 'Ativar envio automático'}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoSendEnabled ? 'left-7' : 'left-1'
                }`}
            />
          </button>
        </div>

        {/* Botão Atualizar */}
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
              console.log('✅ Produto encontrado:', externalData.description?.slice(0, 60));

              // Verifica se já existe uma promoção com a mesma descrição
              const existing = state.promotions.find(p => p.description === externalData.description);

              if (existing) {
                alert(`✅ Produto já cadastrado!\n\n"${getHeadline(existing.description)}"\n\nEste produto já foi inserido anteriormente.`);
              } else {
                // Abre o modal com os dados para edição/envio
                setEditingPromo(externalData);
                setIsModalOpen(true);
              }
            } catch (error: any) {
              console.error('❌ Erro:', error);
              
              // Verifica se é erro de conexão com backend
              if (error.message.includes('500') || error.message.includes('Failed to fetch')) {
                alert('❌ Erro de conexão\n\nO servidor backend não está respondendo.\nVerifique se o backend está rodando em http://localhost:8000');
              } else if (error.message.includes('Nenhum produto')) {
                alert('ℹ️ Nenhum produto novo\n\nNão há novas ofertas disponíveis no momento.');
              } else {
                alert(`❌ Erro ao buscar produto\n\n${error.message}`);
              }
            } finally {
              setIsUpdatingExternal(false);
            }
          }}
          disabled={isUpdatingExternal || autoSendEnabled}
          className={`px-4 py-3 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${autoSendEnabled
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95'
            }`}
          title={autoSendEnabled ? 'Desativado - Modo automático ativo' : 'Sincronizar última oferta'}
        >
          {isUpdatingExternal ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
        </button>

        {/* Botão Nova Promoção */}
        <button
          onClick={() => { setEditingPromo({}); setIsModalOpen(true); }}
          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Nova</span>
        </button>
      </div>

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
                <h4 className="font-bold text-slate-800 dark:text-white line-clamp-2 mb-2 h-12">{getHeadline(promo.description)}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 h-8">
                  {getSnippet(promo.description)}
                </p>
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

                {/* Coluna da Direita: Descrição */}
                <div className="md:col-span-7 flex flex-col gap-6">
                  <div className="space-y-2 h-full">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                    <textarea
                      required
                      rows={12}
                      placeholder="Ex:\nMala Upscape, Samsonite, adulto-unissex\n\n🔥 R$ 466,65\n💳 ou 10x de R$ 46,67\n\n🤑 CUPOM: LEVE15\n🛒 Compre aqui:\nhttps://amzn.to/4qo0u22"
                      className="w-full h-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white whitespace-pre-wrap"
                      value={editingPromo?.description || ''}
                      onChange={e => setEditingPromo(prev => ({ ...prev, description: e.target.value }))}
                    />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tudo (exceto imagem) vai para a descrição</p>
                  </div>
                </div>
              </div>

              {/* Seleção de Grupos: Transmission Board - Full Width */}
              <div className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden">
                {/* Header com Resumo - Clicável para expandir */}
                <button
                  type="button"
                  onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                  className="w-full flex items-center justify-between gap-4 hover:opacity-80 transition-opacity"
                >
                  <div className="text-left">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                      <Share2 size={18} className="text-indigo-500" />
                      Painel de Transmissão
                      {selectedGroups.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px]">
                          {selectedGroups.length} selecionados
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {isPanelExpanded ? 'Clique para recolher' : 'Clique para expandir e selecionar canais'}
                    </p>
                  </div>
                  <ChevronDown 
                    size={20} 
                    className={`text-slate-400 transition-transform duration-300 ${isPanelExpanded ? 'rotate-180' : ''}`} 
                  />
                </button>

                {/* Conteúdo Expansível */}
                <div className={`transition-all duration-300 overflow-hidden ${isPanelExpanded ? 'max-h-[600px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                  {/* Botões de ação */}
                  <div className="flex gap-2 mb-4">
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
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-black uppercase text-[10px] text-slate-400">Cancelar</button>
                <button
                  type="button"
                  onClick={() => setPreviewPromo({
                    ...editingPromo,
                    id: editingPromo?.id || 'preview',
                    description: editingPromo?.description || 'Descricao de exemplo',
                    imageUrl: editingPromo?.imageUrl || '',
                    status: 'DRAFT',
                    ownerId: state.user?.id || 'preview',
                    targetGroupIds: []
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
                <div className="p-3 text-[14px] text-white whitespace-pre-wrap">
                  {previewPromo.description}
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
