
import React, { useState, useMemo } from 'react';
import { 
  Plus, Smartphone, MessageSquare, 
  Trash2, Edit3, Hash, LayoutGrid, CheckCircle2, Users, Loader2, AlertTriangle, X
} from 'lucide-react';
import { AppState, Group } from '../types';
import { api, addLog } from '../services/supabase';

interface GroupsPageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const GroupsPage: React.FC<GroupsPageProps> = ({ state, setState }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<Group> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    if (state.user?.role === 'ADMIN') return state.groups;
    return state.groups.filter(g => g.ownerId === state.user?.id);
  }, [state.groups, state.user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup?.name || !editingGroup?.apiIdentifier || !editingGroup?.platform) return;

    setIsSaving(true);
    const newGroup: Group = {
      id: editingGroup.id || crypto.randomUUID(),
      name: editingGroup.name,
      platform: editingGroup.platform,
      apiIdentifier: editingGroup.apiIdentifier,
      categories: editingGroup.categories || [],
      ownerId: state.user?.id || 'unknown',
    };

    try {
      await api.saveGroup(newGroup);

      setState(prev => ({
        ...prev,
        groups: editingGroup.id 
          ? prev.groups.map(g => g.id === editingGroup.id ? newGroup : g)
          : [...prev.groups, newGroup]
      }));
      
      setIsModalOpen(false);
      setEditingGroup(null);
    } catch (error: any) {
      alert(`Erro ao salvar grupo: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await api.deleteGroup(id);
      setState(prev => ({
        ...prev,
        groups: prev.groups.filter(g => g.id !== id)
      }));
    } catch (error: any) {
      alert(`Erro ao excluir: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Canais de Distribuição</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-widest">Gerencie seus grupos de Telegram e WhatsApp</p>
        </div>
        <button 
          onClick={() => { setEditingGroup({ platform: 'TELEGRAM', categories: [] }); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 active:scale-95 shrink-0"
        >
          <Plus size={22} />
          Novo Canal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
             <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Users className="text-slate-200 dark:text-slate-700" size={40} />
             </div>
             <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-xs tracking-widest">Nenhum canal cadastrado</p>
          </div>
        ) : filteredGroups.map((group) => {
          const isDeleting = deletingId === group.id;
          const isConfirming = confirmDeleteId === group.id;
          
          return (
            <div key={group.id} className={`bg-white dark:bg-slate-900 p-7 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group ${isDeleting ? 'opacity-50 pointer-events-none scale-95' : ''}`}>
              <div className="flex items-start justify-between mb-6">
                <div className={`p-4 rounded-[1.2rem] ${group.platform === 'TELEGRAM' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                  {group.platform === 'TELEGRAM' ? <MessageSquare size={28} /> : <Smartphone size={28} />}
                </div>
                <div className="flex gap-1.5">
                  <button 
                    disabled={isDeleting || isConfirming}
                    onClick={() => { setEditingGroup(group); setIsModalOpen(true); }}
                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                  >
                    <Edit3 size={20} />
                  </button>
                  <button 
                    disabled={isDeleting}
                    onClick={() => handleDelete(group.id)}
                    className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 font-black text-[10px] uppercase tracking-tighter ${
                      isConfirming 
                        ? 'bg-red-600 text-white animate-pulse shadow-lg' 
                        : 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'
                    }`}
                  >
                    {isDeleting ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : isConfirming ? (
                      <>
                        <AlertTriangle size={16} />
                        Sim?
                      </>
                    ) : (
                      <Trash2 size={20} />
                    )}
                  </button>
                </div>
              </div>
              <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">{group.name}</h4>
              <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 mb-6 font-mono">
                <Hash size={16} className="text-indigo-500" />
                <span className="text-xs font-bold tracking-tight">{group.apiIdentifier}</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <LayoutGrid size={16} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nichos Permitidos</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.categories.length > 0 ? group.categories.map(catId => {
                    const cat = state.categories.find(c => c.id === catId || c.name === catId);
                    return (
                      <span key={catId} className={`px-3 py-1 rounded-xl text-[10px] font-black text-white shadow-sm border border-white/10 ${cat?.color || 'bg-slate-500'}`}>
                        {cat?.name}
                      </span>
                    );
                  }) : <span className="text-[11px] text-slate-400 italic font-bold">Geral / Todas as Categorias</span>}
                </div>
              </div>
              
              <div className="mt-8 pt-5 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Sincronizado</span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg">{group.platform}</span>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col transition-colors max-h-[90vh]">
            <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Conectar Canal</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all active:scale-90">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-white dark:bg-slate-900">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setEditingGroup(prev => ({ ...prev, platform: 'TELEGRAM' }))}
                    className={`flex flex-col items-center gap-4 p-6 rounded-[2rem] border-2 transition-all group ${
                      editingGroup?.platform === 'TELEGRAM' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 grayscale hover:grayscale-0'
                    }`}
                  >
                    <MessageSquare size={40} className={editingGroup?.platform === 'TELEGRAM' ? 'text-blue-500' : 'text-slate-400'} />
                    <span className={`font-black text-xs uppercase tracking-widest ${editingGroup?.platform === 'TELEGRAM' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500'}`}>Telegram</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingGroup(prev => ({ ...prev, platform: 'WHATSAPP' }))}
                    className={`flex flex-col items-center gap-4 p-6 rounded-[2rem] border-2 transition-all group ${
                      editingGroup?.platform === 'WHATSAPP' ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 grayscale hover:grayscale-0'
                    }`}
                  >
                    <Smartphone size={40} className={editingGroup?.platform === 'WHATSAPP' ? 'text-green-500' : 'text-slate-400'} />
                    <span className={`font-black text-xs uppercase tracking-widest ${editingGroup?.platform === 'WHATSAPP' ? 'text-green-700 dark:text-green-400' : 'text-slate-500'}`}>WhatsApp</span>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 group-focus-within:text-indigo-500 transition-colors">Identificação do Grupo*</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800 dark:text-white" 
                      placeholder="Ex: Ofertas VIP Tech"
                      value={editingGroup?.name || ''}
                      onChange={e => setEditingGroup(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">API Chat ID / Número Celular*</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold text-indigo-600 dark:text-indigo-400" 
                      placeholder="-100xxxx ou 55119xxx"
                      value={editingGroup?.apiIdentifier || ''}
                      onChange={e => setEditingGroup(prev => ({ ...prev, apiIdentifier: e.target.value }))}
                    />
                  </div>

                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Filtrar por Categorias (Vínculo)</label>
                    <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800/60 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 shadow-inner">
                      {state.categories.length > 0 ? state.categories.map(cat => (
                        <label key={cat.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-50 dark:border-slate-800 shadow-sm group/cat">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                            checked={editingGroup?.categories?.includes(cat.id) || editingGroup?.categories?.includes(cat.name) || false}
                            onChange={e => {
                              const current = editingGroup?.categories || [];
                              const updated = e.target.checked 
                                ? [...current, cat.name] 
                                : current.filter(name => name !== cat.name);
                              setEditingGroup(prev => ({ ...prev, categories: updated }));
                            }}
                          />
                          <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter group-hover/cat:text-indigo-600 transition-colors">{cat.name}</span>
                        </label>
                      )) : (
                        <p className="col-span-2 text-center text-[10px] text-slate-400 uppercase font-black py-4">Nenhuma categoria cadastrada</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-5 px-10 py-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-10 py-4 text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 rounded-3xl transition-all"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="px-12 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-3xl hover:bg-indigo-700 shadow-2xl shadow-indigo-600/40 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={24} className="animate-spin" /> : 'Salvar Canal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsPage;
