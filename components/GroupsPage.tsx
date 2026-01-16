
import React, { useState, useMemo } from 'react';
import { 
  Plus, Smartphone, MessageSquare, 
  Trash2, Edit3, Hash, LayoutGrid, CheckCircle2, Users
} from 'lucide-react';
import { AppState, Group } from '../types';
import { api } from '../services/supabase';

interface GroupsPageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const GroupsPage: React.FC<GroupsPageProps> = ({ state, setState }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<Group> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    } catch (error) {
      alert("Erro ao salvar grupo.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteGroup = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este grupo?')) {
      try {
        await api.deleteGroup(id);
        setState(prev => ({
          ...prev,
          groups: prev.groups.filter(g => g.id !== id)
        }));
      } catch (error) {
        alert("Erro ao excluir grupo.");
        console.error(error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Meus Grupos</h2>
          <p className="text-slate-500">Gerencie onde suas promoções serão entregues</p>
        </div>
        <button 
          onClick={() => { setEditingGroup({ platform: 'TELEGRAM', categories: [] }); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold shadow-lg shadow-indigo-600/20"
        >
          <Plus size={20} />
          Conectar Novo Grupo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredGroups.map((group) => (
          <div key={group.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl ${group.platform === 'TELEGRAM' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                {group.platform === 'TELEGRAM' ? <MessageSquare size={24} /> : <Smartphone size={24} />}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setEditingGroup(group); setIsModalOpen(true); }}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                >
                  <Edit3 size={18} />
                </button>
                <button 
                  onClick={() => deleteGroup(group.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-1">{group.name}</h4>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
              <Hash size={14} />
              <span className="font-mono">{group.apiIdentifier}</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <LayoutGrid size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categorias</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.categories.length > 0 ? group.categories.map(catId => {
                  const cat = state.categories.find(c => c.id === catId);
                  return (
                    <span key={catId} className={`px-2 py-1 rounded-md text-[10px] font-bold text-white ${cat?.color || 'bg-slate-300'}`}>
                      {cat?.name}
                    </span>
                  );
                }) : <span className="text-xs text-slate-400 italic">Nenhuma categoria associada</span>}
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 size={16} />
                <span className="text-xs font-bold uppercase tracking-wide">Ativo</span>
              </div>
              <span className="text-xs text-slate-400 font-medium">{group.platform}</span>
            </div>
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Users size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Nenhum grupo cadastrado</h3>
            <p className="text-slate-500 mb-6">Conecte seu primeiro grupo para começar a enviar promoções</p>
            <button 
              onClick={() => { setEditingGroup({ platform: 'TELEGRAM', categories: [] }); setIsModalOpen(true); }}
              className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              <Plus size={20} />
              Novo Grupo
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Conectar Grupo</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button"
                  onClick={() => setEditingGroup(prev => ({ ...prev, platform: 'TELEGRAM' }))}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    editingGroup?.platform === 'TELEGRAM' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50 grayscale hover:grayscale-0'
                  }`}
                >
                  <MessageSquare size={32} className="text-blue-500" />
                  <span className={`font-bold text-sm ${editingGroup?.platform === 'TELEGRAM' ? 'text-blue-700' : 'text-slate-500'}`}>Telegram</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setEditingGroup(prev => ({ ...prev, platform: 'WHATSAPP' }))}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    editingGroup?.platform === 'WHATSAPP' ? 'border-green-500 bg-green-50' : 'border-slate-100 bg-slate-50 grayscale hover:grayscale-0'
                  }`}
                >
                  <Smartphone size={32} className="text-green-500" />
                  <span className={`font-bold text-sm ${editingGroup?.platform === 'WHATSAPP' ? 'text-green-700' : 'text-slate-500'}`}>WhatsApp</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nome do Grupo*</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="Ex: Ofertas Relâmpago Tech"
                  value={editingGroup?.name || ''}
                  onChange={e => setEditingGroup(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  ID do Chat / API* 
                  <span className="ml-1 text-[10px] font-normal text-slate-400">(ID do grupo ou número)</span>
                </label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="-10012345678 ou 5511999999999"
                  value={editingGroup?.apiIdentifier || ''}
                  onChange={e => setEditingGroup(prev => ({ ...prev, apiIdentifier: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Categorias Permitidas</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                  {state.categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                        checked={editingGroup?.categories?.includes(cat.id) || false}
                        onChange={e => {
                          const current = editingGroup?.categories || [];
                          const updated = e.target.checked 
                            ? [...current, cat.id] 
                            : current.filter(id => id !== cat.id);
                          setEditingGroup(prev => ({ ...prev, categories: updated }));
                        }}
                      />
                      <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Grupo'}
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
