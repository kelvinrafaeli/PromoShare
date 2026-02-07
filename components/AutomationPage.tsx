
import React, { useState } from 'react';
import { Zap, Plus, Settings2, Trash2, Power, AlertCircle, ArrowRight } from 'lucide-react';
import { AppState, AutomationRule } from '../types';

interface AutomationPageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const AutomationPage: React.FC<AutomationPageProps> = ({ state, setState }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AutomationRule>>({ 
    isActive: true, 
    targetGroupIds: [],
    condition: { field: 'description', operator: 'contains', value: '' }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name || !newRule.triggerCategory || (newRule.targetGroupIds?.length === 0)) return;

    const rule: AutomationRule = {
      id: `rule-${Date.now()}`,
      name: newRule.name,
      triggerCategory: newRule.triggerCategory,
      targetGroupIds: newRule.targetGroupIds || [],
      isActive: newRule.isActive ?? true,
      ownerId: state.user?.id || 'unknown',
      condition: newRule.condition
    };

    setState(prev => ({ ...prev, rules: [...prev.rules, rule] }));
    setIsModalOpen(false);
    setNewRule({ isActive: true, targetGroupIds: [] });
  };

  const deleteRule = (id: string) => {
    setState(prev => ({ ...prev, rules: prev.rules.filter(r => r.id !== id) }));
  };

  const toggleRule = (id: string) => {
    setState(prev => ({
      ...prev,
      rules: prev.rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Automação Inteligente</h2>
          <p className="text-slate-500">Defina regras para envio automático baseado em condições</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold shadow-lg shadow-indigo-600/20"
        >
          <Plus size={20} />
          Nova Regra
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {state.rules.map(rule => {
          const cat = state.categories.find(c => c.id === rule.triggerCategory);
          return (
            <div key={rule.id} className={`bg-white p-6 rounded-2xl border ${rule.isActive ? 'border-indigo-100' : 'border-slate-100 grayscale'} shadow-sm relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 -mr-16 -mt-16 rounded-full blur-3xl"></div>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${rule.isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <Zap size={20} />
                  </div>
                  <h4 className="font-bold text-slate-800">{rule.name}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleRule(rule.id)}
                    className={`p-2 rounded-lg transition-colors ${rule.isActive ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                  >
                    <Power size={20} />
                  </button>
                  <button 
                    onClick={() => deleteRule(rule.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-400 font-medium">SE CATEGORIA FOR</span>
                  <span className={`px-2 py-0.5 rounded text-white text-[10px] font-bold uppercase ${cat?.color || 'bg-slate-400'}`}>
                    {cat?.name}
                  </span>
                </div>
                {rule.condition && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-400 font-medium uppercase tracking-tight">E DESCRIÇÃO</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                      CONTÉM {rule.condition.value}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 py-2">
                  <ArrowRight size={16} className="text-indigo-400" />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-slate-400 text-sm font-medium">ENVIAR PARA OS GRUPOS:</span>
                  <div className="flex flex-wrap gap-2">
                    {rule.targetGroupIds.map(gid => {
                      const group = state.groups.find(g => g.id === gid);
                      return (
                        <span key={gid} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200">
                          {group?.name || 'Grupo Desconhecido'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {state.rules.length === 0 && (
          <div className="col-span-full py-16 bg-white rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mb-6">
              <Zap size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Configure sua primeira automação</h3>
            <p className="text-slate-500 max-w-md">Envie promoções automaticamente sem intervenção humana baseada em filtros de preço e categorias.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Zap className="text-indigo-600" size={24} />
                Criar Regra de Envio
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nome da Regra</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="Ex: Auto-Post Ofertas Gamers"
                  value={newRule.name || ''}
                  onChange={e => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Categoria Gatilho</label>
                  <select 
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newRule.triggerCategory || ''}
                    onChange={e => setNewRule(prev => ({ ...prev, triggerCategory: e.target.value }))}
                  >
                    <option value="">Selecione uma categoria...</option>
                    {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Condição (Opcional)</label>
                  <div className="flex gap-2">
                    <select 
                      className="w-1/2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                      onChange={e => setNewRule(prev => ({ 
                        ...prev, 
                        condition: { ...prev.condition!, field: e.target.value as any } 
                      }))}
                    >
                      <option value="description">Descrição contém</option>
                    </select>
                    <input 
                      type="text"
                      className="w-1/2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                      placeholder="Valor..."
                      onChange={e => setNewRule(prev => ({ 
                        ...prev, 
                        condition: { ...prev.condition!, value: e.target.value } 
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Grupos de Destino</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-100 rounded-xl">
                  {state.groups.map(group => (
                    <label key={group.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                        checked={newRule.targetGroupIds?.includes(group.id) || false}
                        onChange={e => {
                          const current = newRule.targetGroupIds || [];
                          const updated = e.target.checked 
                            ? [...current, group.id] 
                            : current.filter(id => id !== group.id);
                          setNewRule(prev => ({ ...prev, targetGroupIds: updated }));
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{group.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{group.platform}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                  <strong>Atenção:</strong> Ao ativar esta regra, novas promoções cadastradas que corresponderem aos critérios serão enviadas imediatamente para os grupos selecionados.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all"
                >
                  Ativar Automação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationPage;
