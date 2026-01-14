
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { AppState } from '../types';
import { 
  Send, Users, Tag, CheckCircle2, TrendingUp, AlertCircle, Clock 
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
}

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const { promotions, groups, categories, user } = state;

  const userPromos = user?.role === 'ADMIN' ? promotions : promotions.filter(p => p.ownerId === user?.id);
  const userGroups = user?.role === 'ADMIN' ? groups : groups.filter(g => g.ownerId === user?.id);

  const stats = [
    { label: 'Total Promoções', value: userPromos.length, icon: Tag, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Enviadas Hoje', value: userPromos.filter(p => p.status === 'SENT').length, icon: Send, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Grupos Ativos', value: userGroups.length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Agendadas', value: userPromos.filter(p => p.status === 'SCHEDULED').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  ];

  // Dummy data for charts
  const activityData = [
    { name: 'Seg', count: 12 },
    { name: 'Ter', count: 18 },
    { name: 'Qua', count: 15 },
    { name: 'Qui', count: 22 },
    { name: 'Sex', count: 30 },
    { name: 'Sab', count: 25 },
    { name: 'Dom', count: 14 },
  ];

  const categoryData = categories.map(cat => ({
    name: cat.name,
    value: userPromos.filter(p => p.mainCategoryId === cat.id).length
  })).filter(d => d.value > 0);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-800">Atividade de Envios</h3>
            <select className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-1.5 outline-none">
              <option>Últimos 7 dias</option>
              <option>Último mês</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-8">Por Categoria</h3>
          <div className="h-72 flex items-center justify-center">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-20" />
                <p>Nenhum dado disponível</p>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {categoryData.map((entry, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                  <span className="text-slate-600">{entry.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Promoções Recentes</h3>
          <button className="text-indigo-600 text-sm font-semibold hover:underline">Ver todas</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-8 py-4">Promoção</th>
                <th className="px-8 py-4">Categoria</th>
                <th className="px-8 py-4">Preço</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userPromos.slice(0, 5).map((promo) => {
                const cat = categories.find(c => c.id === promo.mainCategoryId);
                return (
                  <tr key={promo.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <img src={promo.imageUrl} className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                        <span className="font-medium text-slate-700">{promo.title}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cat?.color || 'bg-slate-200'} text-white`}>
                        {cat?.name || 'Geral'}
                      </span>
                    </td>
                    <td className="px-8 py-4 font-bold text-slate-900">R$ {promo.price.toFixed(2)}</td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-1.5">
                        {promo.status === 'SENT' ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : promo.status === 'SCHEDULED' ? (
                          <Clock size={16} className="text-amber-500" />
                        ) : (
                          <AlertCircle size={16} className="text-slate-400" />
                        )}
                        <span className="text-sm font-medium capitalize">{promo.status.toLowerCase()}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-sm text-slate-500">
                      {new Date(promo.sentAt || promo.scheduledAt || Date.now()).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
