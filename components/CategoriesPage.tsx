
import React, { useState } from 'react';
import { Plus, Tag, Trash2, Edit3, Loader2, AlertTriangle } from 'lucide-react';
import { AppState, Category } from '../types';
import { api, addLog } from '../services/supabase';

interface CategoriesPageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const CategoriesPage: React.FC<CategoriesPageProps> = ({ state, setState }) => {
  const [newCat, setNewCat] = useState({ name: '', color: 'bg-indigo-500' });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const colors = [
    'bg-indigo-500', 'bg-blue-500', 'bg-sky-500', 'bg-emerald-500', 
    'bg-green-500', 'bg-amber-500', 'bg-orange-500', 'bg-rose-500',
    'bg-pink-500', 'bg-purple-500', 'bg-slate-700', 'bg-black'
  ];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name) return;
    
    setIsSaving(true);
    const cat: Category = {
      id: crypto.randomUUID(),
      name: newCat.name,
      color: newCat.color
    };

    try {
      await api.saveCategory(cat);
      setState(prev => ({ ...prev, categories: [...prev.categories, cat] }));
      setNewCat({ name: '', color: 'bg-indigo-500' });
    } catch (error: any) {
      alert(`Erro ao salvar categoria: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Se o usuário ainda não clicou uma vez para confirmar, ativa o estado de confirmação
    if (confirmDeleteId !== id) {
      addLog('UI_PRE_CONFIRM_CAT', 'CLICK', { id });
      setConfirmDeleteId(id);
      // Reseta a confirmação após 3 segundos se ele não clicar de novo
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    addLog('UI_EXECUTE_DELETE_CAT', 'CLICK', { id });
    setDeletingId(id);
    setConfirmDeleteId(null);

    try {
      await api.deleteCategory(id);
      setState(prev => ({ 
        ...prev, 
        categories: prev.categories.filter(c => c.id !== id) 
      }));
      addLog('UI_DELETE_CAT_SUCCESS', 'SUCCESS', id);
    } catch (error: any) {
      addLog('handleDelete_UI_FAIL', 'ERROR', error);
      alert(`Erro na exclusão: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Gerenciar Categorias</h2>
        <p className="text-slate-500">Painel exclusivo do Administrador</p>
      </div>

      <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-bold text-slate-700 mb-2">Nome da Categoria</label>
          <input required type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Ex: Eletrônicos" value={newCat.name} onChange={e => setNewCat(prev => ({ ...prev, name: e.target.value }))} />
        </div>
        <div className="w-full md:w-64">
          <label className="block text-sm font-bold text-slate-700 mb-2">Selecione a Cor</label>
          <div className="flex flex-wrap gap-2">
            {colors.map(c => (
              <button 
                key={c} 
                type="button" 
                onClick={() => setNewCat(prev => ({ ...prev, color: c }))} 
                className={`w-8 h-8 rounded-lg transition-all ${c} ${newCat.color === c ? 'scale-110 ring-2 ring-indigo-600 ring-offset-2 shadow-md' : 'opacity-60 hover:opacity-100'}`} 
              />
            ))}
          </div>
        </div>
        <button type="submit" disabled={isSaving} className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-transform disabled:opacity-50 h-[46px]">
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
          Adicionar
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.categories.map(cat => {
          const isDeleting = deletingId === cat.id;
          const isConfirming = confirmDeleteId === cat.id;

          return (
            <div key={cat.id} className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group transition-all hover:shadow-md ${isDeleting ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${cat.color} flex items-center justify-center text-white shadow-lg shadow-black/5`}>
                  <Tag size={24} />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-lg block">{cat.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  disabled={isDeleting} 
                  onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }} 
                  className={`p-3 rounded-xl transition-all flex items-center gap-2 font-bold text-xs ${
                    isConfirming 
                      ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/20' 
                      : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                  }`}
                >
                  {isDeleting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : isConfirming ? (
                    <>
                      <AlertTriangle size={16} />
                      CONFIRMAR?
                    </>
                  ) : (
                    <Trash2 size={20} />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoriesPage;
