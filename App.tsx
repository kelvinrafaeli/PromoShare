
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  Tag, 
  Send, 
  Users, 
  LogOut, 
  Bell, 
  TrendingUp,
  Terminal,
  X,
  Sun,
  Moon
} from 'lucide-react';

import { User, AppState } from './types';
import { api, debugLogs, supabase, addLog } from './services/supabase';
import PromotionsPage from './components/PromotionsPage';
import GroupsPage from './components/GroupsPage';
import CategoriesPage from './components/CategoriesPage';
import Login from './components/Login';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    user: null,
    promotions: [],
    groups: [],
    categories: [],
    rules: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        addLog('App.init', 'INFO', 'Sessão ativa encontrada');
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single();

        const userData: User = {
          id: session.user.id,
          name: profile?.name || session.user.email?.split('@')[0] || 'Usuário',
          email: session.user.email || '',
          role: (profile?.role as any) || 'USER',
          avatar: profile?.avatar || `https://ui-avatars.com/api/?name=${session.user.email}`
        };

        setState(prev => ({ ...prev, user: userData }));
      }
      setIsLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setState(prev => ({ ...prev, user: null }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (state.user) {
      const loadData = async () => {
        try {
          const data = await api.fetchAll();
          setState(prev => ({
            ...prev,
            promotions: data.promotions,
            groups: data.groups,
            categories: data.categories
          }));
        } catch (error) {
          console.error("Failed to load data:", error);
          addLog('loadData', 'ERROR', error);
        }
      };
      loadData();
    }
  }, [state.user]);

  const handleLogin = (user: User) => {
    setState(prev => ({ ...prev, user }));
  };

  const handleLogout = async () => {
    await api.logout();
    setState(prev => ({ ...prev, user: null }));
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <TrendingUp className="text-indigo-500 animate-pulse" size={48} />
      </div>
    );
  }

  if (!state.user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300`}>
        <Sidebar user={state.user} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto relative">
          <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">PromoShare</h1>
            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={toggleTheme}
                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Alternar Tema"
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <button 
                onClick={() => setShowDebug(!showDebug)}
                className={`p-2 rounded-lg transition-colors ${showDebug ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Abrir Logs de Depuração"
              >
                <Terminal size={20} />
              </button>
              <button className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
              </button>
              <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 md:mx-2"></div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{state.user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{state.user.role.toLowerCase()}</p>
                </div>
                <img src={state.user.avatar} className="w-10 h-10 rounded-full border-2 border-slate-100 dark:border-slate-800 object-cover" alt="Avatar" />
              </div>
            </div>
          </header>

          <div className="p-4 md:p-8">
            <Routes>
              <Route path="/promotions" element={<PromotionsPage state={state} setState={setState} />} />
              <Route path="/groups" element={<GroupsPage state={state} setState={setState} />} />
              <Route path="/categories" element={<CategoriesPage state={state} setState={setState} />} />
              <Route path="/" element={<Navigate to="/promotions" />} />
              <Route path="*" element={<Navigate to="/promotions" />} />
            </Routes>
          </div>

          {showDebug && <DebugPanel onClose={() => setShowDebug(false)} />}
        </main>
      </div>
    </HashRouter>
  );
};

const DebugPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [logs, setLogs] = useState([...debugLogs]);

  useEffect(() => {
    const handleUpdate = () => setLogs([...debugLogs]);
    window.addEventListener('supabase-log-update', handleUpdate);
    return () => window.removeEventListener('supabase-log-update', handleUpdate);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 w-96 max-h-[500px] bg-slate-900 text-slate-300 rounded-2xl shadow-2xl border border-white/10 flex flex-col z-[100] overflow-hidden">
      <div className="p-4 bg-slate-800 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-indigo-400" />
          <span className="font-bold text-sm uppercase tracking-widest">Supabase Logs</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-[10px]">
        {logs.length === 0 && <p className="text-slate-600 p-4 text-center italic">Nenhuma atividade registrada.</p>}
        {logs.map((log, i) => (
          <div key={i} className={`p-2 rounded border ${log.status === 'ERROR' ? 'bg-red-950/30 border-red-900/50 text-red-300' : 'bg-slate-800/50 border-white/5'}`}>
            <div className="flex justify-between mb-1">
              <span className="font-bold">{log.method}</span>
              <span className="opacity-40">{log.timestamp}</span>
            </div>
            <pre className="whitespace-pre-wrap opacity-80 overflow-x-auto">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
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
    <aside className="w-64 bg-slate-900 dark:bg-black text-slate-300 flex flex-col hidden lg:flex border-r border-slate-800">
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
                  : 'hover:bg-slate-800 hover:text-white dark:hover:bg-slate-900'
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
          className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium text-sm">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default App;
