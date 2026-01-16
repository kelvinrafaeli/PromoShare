
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  Tag, 
  Send, 
  Users, 
  LogOut, 
  Bell, 
  TrendingUp,
} from 'lucide-react';

import { User, AppState } from './types';
import { INITIAL_CATEGORIES } from './constants';
import { api } from './services/supabase';
import PromotionsPage from './components/PromotionsPage';
import GroupsPage from './components/GroupsPage';
import CategoriesPage from './components/CategoriesPage';
import Login from './components/Login';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    user: null,
    promotions: [],
    groups: [],
    categories: INITIAL_CATEGORIES,
    rules: []
  });

  const [isLoading, setIsLoading] = useState(false);

  // Fetch initial data from Supabase when user logs in
  useEffect(() => {
    if (state.user) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const data = await api.fetchAll();
          setState(prev => ({
            ...prev,
            promotions: data.promotions,
            groups: data.groups,
            // Only overwrite categories if we got some from DB, else keep defaults
            categories: data.categories.length > 0 ? data.categories : prev.categories
          }));
        } catch (error) {
          console.error("Failed to load data from Supabase:", error);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [state.user]);

  const handleLogin = (user: User) => {
    setState(prev => ({ ...prev, user }));
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, user: null }));
  };

  if (!state.user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-50">
        <Sidebar user={state.user} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-800">PromoShare</h1>
            <div className="flex items-center gap-4">
              <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-700">{state.user.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{state.user.role.toLowerCase()}</p>
                </div>
                <img src={state.user.avatar} className="w-10 h-10 rounded-full border-2 border-slate-100 object-cover" alt="Avatar" />
              </div>
            </div>
          </header>

          <div className="p-8">
            {isLoading ? (
              <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
                <TrendingUp className="animate-bounce" />
                <span>Carregando dados...</span>
              </div>
            ) : (
              <Routes>
                <Route path="/promotions" element={<PromotionsPage state={state} setState={setState} />} />
                <Route path="/groups" element={<GroupsPage state={state} setState={setState} />} />
                <Route path="/categories" element={<CategoriesPage state={state} setState={setState} />} />
                <Route path="/" element={<Navigate to="/promotions" />} />
                <Route path="*" element={<Navigate to="/promotions" />} />
              </Routes>
            )}
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

const Sidebar: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { label: 'Promoções', icon: Send, path: '/promotions' },
    { label: 'Grupos', icon: Users, path: '/groups' },
    { label: 'Categorias', icon: Tag, path: '/categories', adminOnly: true },
  ];

  const filteredNav = navItems.filter(item => !item.adminOnly || user.role === 'ADMIN');

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden lg:flex">
      <div className="p-6">
        <div className="flex items-center gap-2 text-white mb-8">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">PromoShare</span>
        </div>
        <nav className="space-y-1">
          {filteredNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path) 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-6 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium text-sm">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default App;
