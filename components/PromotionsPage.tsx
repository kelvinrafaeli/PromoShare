
import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, Send, Trash2, Edit3, 
  Eye, CheckCircle, Clock, Save, Smartphone, MessageSquare,
  Users
} from 'lucide-react';
import { AppState, Promotion, Group } from '../types';

interface PromotionsPageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const PromotionsPage: React.FC<PromotionsPageProps> = ({ state, setState }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Partial<Promotion> | null>(null);
  const [previewPromo, setPreviewPromo] = useState<Promotion | null>(null);

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo?.title || !editingPromo?.price || !editingPromo?.mainCategoryId) return;

    const newPromo: Promotion = {
      id: editingPromo.id || `promo-${Date.now()}`,
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

    setState(prev => ({
      ...prev,
      promotions: editingPromo.id 
        ? prev.promotions.map(p => p.id === editingPromo.id ? newPromo : p)
        : [newPromo, ...prev.promotions]
    }));
    
    setIsModalOpen(false);
    setEditingPromo(null);
  };

  const deletePromo = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta promoção?')) {
      setState(prev => ({
        ...prev,
        promotions: prev.promotions.filter(p => p.id !== id)
      }));
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
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-600">
            <Filter size={18} />
            Filtrar
          </button>
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
          return (
            <div key={promo.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group">
              <div className="relative h-48 overflow-hidden">
                <img src={promo.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${category?.color || 'bg-slate-400'}`}>
                    {category?.name}
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className={`p-1.5 rounded-lg bg-white/90 backdrop-blur shadow-sm ${
                    promo.status === 'SENT' ? 'text-green-600' : promo.status === 'SCHEDULED' ? 'text-amber-600' : 'text-slate-500'
                  }`}>
                    {promo.status === 'SENT' ? <CheckCircle size={14} /> : promo.status === 'SCHEDULED' ? <Clock size={14} /> : <Edit3 size={14} />}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <h4 className="font-bold text-slate-800 line-clamp-2 leading-tight h-10">{promo.title}</h4>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-extrabold text-indigo-600">R$ {promo.price.toFixed(2)}</p>
                  {promo.coupon && (
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded uppercase">
                      CUPOM: {promo.coupon}
                    </span>
                  )}
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setPreviewPromo(promo)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Preview"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => { setEditingPromo(promo); setIsModalOpen(true); }}
                      className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                      title="Editar"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => deletePromo(promo.id)}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
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
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="Ex: iPhone 15 Pro Max 256GB"
                    value={editingPromo?.title || ''}
                    onChange={e => setEditingPromo(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Preço (R$)*</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                      placeholder="0,00"
                      value={editingPromo?.price || ''}
                      onChange={e => setEditingPromo(prev => ({ ...prev, price: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Cupom (Opcional)</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                      placeholder="BLACK10"
                      value={editingPromo?.coupon || ''}
                      onChange={e => setEditingPromo(prev => ({ ...prev, coupon: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Link da Promoção*</label>
                  <input 
                    required
                    type="url" 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="https://..."
                    value={editingPromo?.link || ''}
                    onChange={e => setEditingPromo(prev => ({ ...prev, link: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Categoria Principal*</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editingPromo?.mainCategoryId || ''}
                    onChange={e => setEditingPromo(prev => ({ ...prev, mainCategoryId: e.target.value }))}
                  >
                    {state.categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-5 lg:col-span-1 border-x lg:px-8 border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Destino do Envio</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  <label className="block text-sm font-bold text-slate-700">Selecione os Grupos</label>
                  {userGroups.length > 0 ? userGroups.map(group => (
                    <label 
                      key={group.id} 
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        editingPromo?.targetGroupIds?.includes(group.id) 
                          ? 'border-indigo-600 bg-indigo-50' 
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={editingPromo?.targetGroupIds?.includes(group.id) || false}
                        onChange={() => toggleGroupSelection(group.id)}
                      />
                      <div className={`p-2 rounded-lg ${group.platform === 'TELEGRAM' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        {group.platform === 'TELEGRAM' ? <MessageSquare size={16} /> : <Smartphone size={16} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">{group.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{group.platform}</p>
                      </div>
                      {editingPromo?.targetGroupIds?.includes(group.id) && (
                        <CheckCircle size={18} className="text-indigo-600" />
                      )}
                    </label>
                  )) : (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 px-4">
                      <Users size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs text-slate-500 font-medium">Você ainda não tem grupos cadastrados.</p>
                      <button type="button" className="text-indigo-600 text-xs font-bold mt-2 hover:underline">Cadastrar Grupos</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">URL da Imagem</label>
                  <input 
                    type="url" 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="https://picsum.photos/..."
                    value={editingPromo?.imageUrl || ''}
                    onChange={e => setEditingPromo(prev => ({ ...prev, imageUrl: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-5 lg:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-200 h-fit">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-700">Descrição do Produto (Opcional)</label>
                </div>
                <textarea 
                  className="w-full h-40 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Escreva detalhes sobre o produto..."
                  value={editingPromo?.content || ''}
                  onChange={e => setEditingPromo(prev => ({ ...prev, content: e.target.value }))}
                ></textarea>
                <div className="bg-white p-4 rounded-xl border border-slate-100">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Preview da Descrição</h5>
                  <div className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {editingPromo?.content || 'Nenhuma descrição informada.'}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-10 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  <Save size={18} />
                  Salvar Promoção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal (Send Simulation) */}
      {previewPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-[#f0f2f5] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#00a884] p-4 flex items-center gap-4">
              <button onClick={() => setPreviewPromo(null)} className="text-white">
                <Plus size={24} className="rotate-45" />
              </button>
              <div className="flex-1">
                <h3 className="text-white font-bold">Visualização do Envio</h3>
                <p className="text-white/80 text-xs">Simulação de Mensagem</p>
              </div>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-white p-2 rounded-lg shadow-sm w-[90%] float-left relative">
                <div className="rounded overflow-hidden mb-2">
                  <img src={previewPromo.imageUrl} className="w-full h-40 object-cover" />
                </div>
                <div className="text-sm whitespace-pre-wrap mb-1">
                  <strong>🔥 {previewPromo.title}</strong><br /><br />
                  💰 <strong>R$ {previewPromo.price.toFixed(2)}</strong><br />
                  {previewPromo.coupon && <span>🎟️ Cupom: {previewPromo.coupon}<br /></span>}
                  <br />
                  {previewPromo.content && <span>{previewPromo.content}<br /><br /></span>}
                  🔗 {previewPromo.link}
                </div>
                <div className="text-[10px] text-slate-400 text-right">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            <div className="p-4 bg-white border-t border-slate-200">
              <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                <Send size={18} />
                Enviar Agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsPage;
