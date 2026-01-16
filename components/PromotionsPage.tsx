
import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, Send, Trash2, Edit3, 
  Eye, CheckCircle, Clock, Save, Smartphone, MessageSquare,
  Users, Loader2
} from 'lucide-react';
import { AppState, Promotion, Group } from '../types';
import { api } from '../services/supabase';

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredPromos = useMemo(() => {
    let list = state.promotions;
    if (state.user?.role !== 'ADMIN') {
      list = list.filter(p => p.ownerId === state.user?.id);
    }
    return list.filter(p => 
      p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [state.promotions, state.user, searchTerm]);

  const userGroups = useMemo(() => {
    if (state.user?.role === 'ADMIN') return state.groups;
    return state.groups.filter(g => g.ownerId === state.user?.id);
  }, [state.groups, state.user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo?.title || !editingPromo?.price || !editingPromo?.mainCategoryId) return;

    setIsSaving(true);
    const newPromo: Promotion = {
      id: editingPromo.id || crypto.randomUUID(),
      title: editingPromo.title,
      price: Number(editingPromo.price),
      link: editingPromo.link || '',
      imageUrl: editingPromo.imageUrl || 'https://picsum.photos/400/300',
      mainCategoryId: editingPromo.mainCategoryId,
      secondaryCategoryIds: editingPromo.secondaryCategoryIds || [],
      status: editingPromo.status || 'DRAFT',
      coupon: editingPromo.coupon,
      ownerId: state.user?.id || 'unknown',
      content: editingPromo.content || '',
      scheduledAt: editingPromo.scheduledAt,
      sentAt: editingPromo.status === 'SENT' ? new Date().toISOString() : undefined,
      targetGroupIds: editingPromo.targetGroupIds || [],
    };

    try {
      await api.savePromotion(newPromo);
      setState(prev => ({
        ...prev,
        promotions: editingPromo.id 
          ? prev.promotions.map(p => p.id === editingPromo.id ? newPromo : p)
          : [newPromo, ...prev.promotions]
      }));
      setIsModalOpen(false);
      setEditingPromo(null);
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deletePromo = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta promoção permanentemente?')) {
      setDeletingId(id);
      try {
        await api.deletePromotion(id);
        setState(prev => ({
          ...prev,
          promotions: prev.promotions.filter(p => p.id !== id)
        }));
      } catch (error: any) {
        alert(`Não foi possível excluir: ${error.message || 'Verifique as permissões do banco.'}`);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    const current = editingPromo?.targetGroupIds || [];
    const updated = current.includes(groupId) 
      ? current.filter(id => id !== groupId)
      : [...current, groupId];
    setEditingPromo(prev => ({ ...prev, targetGroupIds: updated }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar promoção..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => { setEditingPromo({ mainCategoryId: state.categories[0]?.id, targetGroupIds: [] }); setIsModalOpen(true); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-indigo-600/20"
          >
            <Plus size={18} />
            Nova Promoção
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPromos.map((promo) => {
          const category = state.categories.find(c => c.id === promo.mainCategoryId);
          const isDeleting = deletingId === promo.id;

          return (
            <div key={promo.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group transition-opacity ${isDeleting ? 'opacity-50' : ''}`}>
              <div className="relative h-48 overflow-hidden">
                <img src={promo.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${category?.color || 'bg-slate-400'}`}>
                    {category?.name || 'Geral'}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <h4 className="font-bold text-slate-800 line-clamp-2 leading-tight h-10">{promo.title}</h4>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-extrabold text-indigo-600">R$ {promo.price.toFixed(2)}</p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    <button 
                      disabled={isDeleting}
                      onClick={() => setPreviewPromo(promo)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      disabled={isDeleting}
                      onClick={() => { setEditingPromo(promo); setIsModalOpen(true); }}
                      className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      disabled={isDeleting}
                      onClick={() => deletePromo(promo.id)}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    </button>
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-black transition-colors">
                    <Send size={14} />
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">{editingPromo?.id ? 'Editar Promoção' : 'Nova Promoção'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-5 lg:col-span-1">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Informações Básicas</h3>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Título da Promoção*</label>
                  <input required type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={editingPromo?.title || ''} onChange={e => setEditingPromo(prev => ({ ...prev, title: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Preço (R$)*</label>
                  <input required type="number" step="0.01" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={editingPromo?.price || ''} onChange={e => setEditingPromo(prev => ({ ...prev, price: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Link*</label>
                  <input required type="url" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={editingPromo?.link || ''} onChange={e => setEditingPromo(prev => ({ ...prev, link: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Categoria Principal*</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={editingPromo?.mainCategoryId || ''} onChange={e => setEditingPromo(prev => ({ ...prev, mainCategoryId: e.target.value }))}>
                    {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="lg:col-span-3 flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-10 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-[#f0f2f5] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#00a884] p-4 flex items-center gap-4">
              <button onClick={() => setPreviewPromo(null)} className="text-white"><Plus size={24} className="rotate-45" /></button>
              <h3 className="text-white font-bold">Visualização</h3>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-white p-2 rounded-lg shadow-sm w-[90%]">
                <img src={previewPromo.imageUrl} className="w-full h-40 object-cover rounded mb-2" />
                <div className="text-sm"><strong>{previewPromo.title}</strong><br />💰 R$ {previewPromo.price.toFixed(2)}<br />🔗 {previewPromo.link}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsPage;
