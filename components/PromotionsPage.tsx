
import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, Send, Trash2, Edit3, 
  Eye, CheckCircle, Clock, Save, Smartphone, MessageSquare,
  Users, Loader2
} from 'lucide-react';
import { AppState, Promotion, Group } from '../types';
import { api, addLog } from '../services/supabase';

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo?.title || !editingPromo?.price || !editingPromo?.mainCategoryId) return;

    setIsSaving(true);
    // Usamos um ID temporário se for novo, mas o banco irá sobrescrever
    const promoToSave: Promotion = {
      id: editingPromo.id || `temp-${Date.now()}`,
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
      const savedPromo = await api.savePromotion(promoToSave);
      
      setState(prev => {
        const isUpdate = editingPromo.id && !editingPromo.id.startsWith('temp-');
        const newList = isUpdate
          ? prev.promotions.map(p => p.id === editingPromo.id ? savedPromo : p)
          : [savedPromo, ...prev.promotions.filter(p => p.id !== promoToSave.id)];
        
        return { ...prev, promotions: newList };
      });
      
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
    if (confirm('Tem certeza que deseja excluir esta promoção?')) {
      setDeletingId(id);
      try {
        await api.deletePromotion(id);
        setState(prev => ({
          ...prev,
          promotions: prev.promotions.filter(p => p.id !== id)
        }));
      } catch (error: any) {
        alert(error.message || 'Erro ao excluir.');
      } finally {
        setDeletingId(null);
      }
    }
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
        <button 
          onClick={() => { setEditingPromo({ mainCategoryId: state.categories[0]?.id || '', targetGroupIds: [] }); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold shadow-lg shadow-indigo-600/20"
        >
          <Plus size={18} />
          Nova Promoção
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPromos.map((promo) => {
          const category = state.categories.find(c => c.id === promo.mainCategoryId);
          const isDeleting = deletingId === promo.id;

          return (
            <div key={promo.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group transition-all hover:shadow-md ${isDeleting ? 'opacity-50' : ''}`}>
              <div className="relative h-48 overflow-hidden bg-slate-50">
                <img src={promo.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={promo.title} />
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ${category?.color || 'bg-slate-400'}`}>
                    {category?.name || 'Geral'}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <h4 className="font-bold text-slate-800 line-clamp-2 leading-tight h-10">{promo.title}</h4>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-extrabold text-indigo-600">R$ {promo.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <span className="text-[10px] font-mono text-slate-300">#{promo.id}</span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    <button onClick={() => setPreviewPromo(promo)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Eye size={18} /></button>
                    <button onClick={() => { setEditingPromo(promo); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><Edit3 size={18} /></button>
                    <button disabled={isDeleting} onClick={() => deletePromo(promo.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
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
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">{editingPromo?.id && !editingPromo.id.startsWith('temp-') ? 'Editar Promoção' : 'Cadastrar Oferta'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Título*</label>
                  <input required type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={editingPromo?.title || ''} onChange={e => setEditingPromo(prev => ({ ...prev, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Preço (R$)*</label>
                    <input required type="number" step="0.01" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={editingPromo?.price || ''} onChange={e => setEditingPromo(prev => ({ ...prev, price: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Cupom</label>
                    <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Opcional" value={editingPromo?.coupon || ''} onChange={e => setEditingPromo(prev => ({ ...prev, coupon: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Link da Oferta*</label>
                  <input required type="url" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={editingPromo?.link || ''} onChange={e => setEditingPromo(prev => ({ ...prev, link: e.target.value }))} />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">URL da Imagem</label>
                  <input type="url" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={editingPromo?.imageUrl || ''} onChange={e => setEditingPromo(prev => ({ ...prev, imageUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Categoria*</label>
                  <select required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={editingPromo?.mainCategoryId || ''} onChange={e => setEditingPromo(prev => ({ ...prev, mainCategoryId: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {state.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="px-8 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-600/20">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {editingPromo?.id ? 'Atualizar' : 'Salvar Oferta'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewPromo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-[#f0f2f5] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#00a884] p-4 flex items-center justify-between text-white">
              <h3 className="font-bold flex items-center gap-2"><Smartphone size={20}/> Preview WhatsApp</h3>
              <button onClick={() => setPreviewPromo(null)} className="p-1 hover:bg-black/10 rounded-lg"><Plus size={24} className="rotate-45" /></button>
            </div>
            <div className="p-4 bg-[#e5ddd5] min-h-[300px]">
              <div className="bg-white p-2 rounded-lg shadow-sm w-[90%] space-y-2">
                <img src={previewPromo.imageUrl} className="w-full h-44 object-cover rounded" alt="Preview" />
                <div className="text-[13px] leading-relaxed">
                  <p><strong>🔥 {previewPromo.title}</strong></p>
                  <p className="text-green-600 font-bold mt-1">💰 R$ {previewPromo.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  {previewPromo.coupon && <p className="bg-yellow-100 px-1 inline-block mt-1">🎟 Cupom: <strong>{previewPromo.coupon}</strong></p>}
                  <p className="mt-2 text-blue-600 break-all underline">🔗 {previewPromo.link}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsPage;
