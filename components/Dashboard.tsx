
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { AppState } from '../types';
import {
  Send, Users, Tag, CheckCircle2, TrendingUp, AlertCircle, Clock, Zap, Target, Calendar, Package
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface DashboardProps {
  state: AppState;
}

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const { promotions, groups, categories, user } = state;

  const userPromos = user?.role === 'ADMIN' ? promotions : promotions.filter(p => p.ownerId === user?.id);
  const userGroups = user?.role === 'ADMIN' ? groups : groups.filter(g => g.ownerId === user?.id);

  const stats = [
    { 
      label: 'Total Promoções', 
      value: userPromos.length, 
      icon: Package, 
      gradient: 'from-indigo-500 to-indigo-600',
      shadow: 'shadow-indigo-500/20',
      iconBg: 'bg-indigo-500/10',
      trend: '+12%'
    },
    { 
      label: 'Enviadas Hoje', 
      value: userPromos.filter(p => p.status === 'SENT').length, 
      icon: Zap, 
      gradient: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-500/20',
      iconBg: 'bg-emerald-500/10',
      trend: '+8%'
    },
    { 
      label: 'Canais Ativos', 
      value: userGroups.length, 
      icon: Users, 
      gradient: 'from-cyan-500 to-cyan-600',
      shadow: 'shadow-cyan-500/20',
      iconBg: 'bg-cyan-500/10',
      trend: '+3'
    },
    { 
      label: 'Agendadas', 
      value: userPromos.filter(p => p.status === 'SCHEDULED').length, 
      icon: Calendar, 
      gradient: 'from-orange-500 to-orange-600',
      shadow: 'shadow-orange-500/20',
      iconBg: 'bg-orange-500/10',
      trend: '+5'
    },
  ];

  // Dados de atividade com valores mais dinâmicos
  const activityData = [
    { name: 'Seg', count: 12, label: 'Segunda' },
    { name: 'Ter', count: 18, label: 'Terça' },
    { name: 'Qua', count: 15, label: 'Quarta' },
    { name: 'Qui', count: 22, label: 'Quinta' },
    { name: 'Sex', count: 30, label: 'Sexta' },
    { name: 'Sab', count: 25, label: 'Sábado' },
    { name: 'Dom', count: 14, label: 'Domingo' },
  ];

  const categoryData = categories.map(cat => ({
    name: cat.name,
    value: userPromos.filter(p => p.mainCategoryId === cat.id).length
  })).filter(d => d.value > 0);

  const COLORS = ['#6366f1', '#10b981', '#06b6d4', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Stats Cards - Design Moderno com Gradientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card 
            key={i} 
            className={`group relative overflow-hidden border-0 bg-gradient-to-br ${stat.gradient} p-[1px] hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer`}
          >
            <div className="bg-white dark:bg-slate-900 rounded-[15px] p-5 h-full">
              <CardContent className="p-0">
                <div className="flex items-start justify-between mb-3">
                  <div className={`${stat.iconBg} p-3 rounded-xl`}>
                    <stat.icon size={24} className={`bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`} strokeWidth={2.5} />
                  </div>
                  <Badge className={`bg-gradient-to-r ${stat.gradient} text-white shadow-lg`}>
                    {stat.trend}
                  </Badge>
                </div>
                <div>
                  <h3 className={`text-3xl font-black mb-1 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                    {stat.value}
                  </h3>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Section - Layout Assimétrico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart - Mais Destaque */}
        <Card className="lg:col-span-2 hover:shadow-2xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Atividade de Envios</CardTitle>
                <CardDescription>Últimos 7 dias</CardDescription>
              </div>
              <Badge variant="success" className="flex items-center gap-1.5">
                <TrendingUp size={14} />
                <span>+18%</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} 
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'white',
                    padding: '12px'
                  }}
                  labelStyle={{ fontWeight: 700, color: '#1e293b' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Design Premium */}
        <Card className="hover:shadow-2xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle>Por Categoria</CardTitle>
            <CardDescription>Distribuição atual</CardDescription>
          </CardHeader>
          <CardContent className="h-48 flex items-center justify-center">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'white',
                      padding: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 dark:text-slate-600">
                <Target size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Nenhum dado</p>
              </div>
            )}
          </CardContent>
          <CardContent className="pt-0">
            <div className="space-y-2.5">
              {categoryData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-lg transition-colors cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{entry.name}</span>
                  </div>
                  <Badge variant="secondary" className="font-black">{entry.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Promoções Recentes - Design Premium */}
      <Card className="overflow-hidden hover:shadow-2xl transition-shadow duration-300">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Promoções Recentes</CardTitle>
              <CardDescription>Últimas 5 promoções cadastradas</CardDescription>
            </div>
            <Button variant="gradient" size="sm">
              Ver Todas
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs uppercase font-black tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-left">Promoção</th>
                  <th className="px-6 py-4 text-left">Categoria</th>
                  <th className="px-6 py-4 text-left">Preço</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {userPromos.slice(0, 5).map((promo) => {
                  const cat = categories.find(c => c.id === promo.mainCategoryId);
                  return (
                    <tr 
                      key={promo.id} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img 
                              src={promo.imageUrl} 
                              className="w-12 h-12 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 shadow-sm ring-2 ring-slate-100 dark:ring-slate-800 group-hover:ring-indigo-500/50 transition-all" 
                              alt={promo.title}
                            />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-white text-sm block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {promo.title}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">ID: {promo.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={`${cat?.color || 'bg-slate-200 dark:bg-slate-700'} text-white shadow-sm`}>
                          {cat?.name || 'Geral'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-slate-900 dark:text-white text-base">{promo.price}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {promo.status === 'SENT' ? (
                            <>
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
                              <Badge variant="success">Enviada</Badge>
                            </>
                          ) : promo.status === 'SCHEDULED' ? (
                            <>
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-lg shadow-orange-500/50"></div>
                              <Badge variant="warning">Agendada</Badge>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                              <Badge variant="secondary">Pendente</Badge>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Clock size={14} />
                          <span className="text-sm font-medium">
                            {new Date(promo.sentAt || promo.scheduledAt || Date.now()).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
