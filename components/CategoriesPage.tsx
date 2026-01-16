
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
    if (confirmDeleteId !== id) {
      addLog('UI_PRE_CONFIRM_CAT', 'CLICK', { id });
      setConfirmDeleteId(id);
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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Gerenciar Categorias</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Painel exclusivo para organização de nichos e grupos</p>
      </div>

      <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-6 items-end transition-colors">
        <div className="flex-1 w-full group">
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 group-focus-within:text-indigo-500 transition-colors">Nome da Categoria</label>
          <input 
            required 
            type="text" 
            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold dark:text-white" 
            placeholder="Ex: Eletrônicos" 
            value={newCat.name} 
            onChange={e => setNewCat(prev => ({ ...prev, name: e.target.value }))} 
          />
        </div>
        <div className="w-full md:w-64">
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Estética / Cor</label>
          <div className="flex flex-wrap gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
            {colors.map(c => (
              <button 
                key={c} 
                type="button" 
                onClick={() => setNewCat(prev => ({ ...prev, color: c }))} 
                className={`w-7 h-7 rounded-lg transition-all ${c} ${newCat.color === c ? 'scale-110 ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-slate-900 shadow-md' : 'opacity-40 hover:opacity-100'}`} 
              />
            ))}
          </div>
        </div>
        <button type="submit" disabled={isSaving} className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50">
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
          Adicionar
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.categories.map(cat => {
          const isDeleting = deletingId === cat.id;
          const isConfirming = confirmDeleteId === cat.id;

          return (
            <div key={cat.id} className={`bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group transition-all hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900 ${isDeleting ? 'opacity-50 grayscale' : ''}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${cat.color} flex items-center justify-center text-white shadow-lg shadow-black/10 border border-white/20 transition-transform group-hover:scale-110 duration-500`}>
                  <Tag size={22} />
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-lg block tracking-tight">{cat.name}</span>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nicho Ativo</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  disabled={isDeleting} 
                  onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }} 
                  className={`p-3 rounded-xl transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-tighter ${
                    isConfirming 
                      ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/30' 
                      : 'text-slate-400 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                >
                  {isDeleting ? (
                    <Loader2 size={18} className="animate-spin" />
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoriesPage;
