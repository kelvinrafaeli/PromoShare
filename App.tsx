
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import {
  Tag,
  Send,
  Users,
  LogOut,
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
      <div className={`flex flex-col lg:flex-row h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-hidden`}>
        <Sidebar user={state.user} onLogout={handleLogout} />

        <main className="flex-1 overflow-y-auto relative flex flex-col pb-20 lg:pb-0">
          <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="lg:hidden bg-indigo-600 p-1.5 rounded-lg text-white">
                <TrendingUp size={18} />
              </div>
              <h1 className="text-lg md:text-xl font-black text-slate-800 dark:text-white tracking-tighter">PromoShare</h1>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-90"
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className={`p-2 rounded-xl transition-all active:scale-90 ${showDebug ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Terminal size={20} />
              </button>
              <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1"></div>
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter">{state.user.name}</p>
                </div>
                <img src={state.user.avatar} className="w-8 h-8 rounded-full border-2 border-indigo-500/20 object-cover" alt="Avatar" />
              </div>
            </div>
          </header>

          <div className="p-4 md:p-8 flex-1">
            <Routes>
              <Route path="/promotions" element={<PromotionsPage state={state} setState={setState} />} />
              <Route path="/groups" element={<GroupsPage state={state} setState={setState} />} />
              <Route path="/" element={<Navigate to="/promotions" />} />
            </Routes>
          </div>

          {showDebug && <DebugPanel onClose={() => setShowDebug(false)} />}
        </main>

        <BottomNav user={state.user} onLogout={handleLogout} />
      </div>
    </HashRouter>
  );
};

const BottomNav: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { label: 'Promos', icon: Send, path: '/promotions' },
    { label: 'Canais', icon: Users, path: '/groups' },
    { label: 'Sair', icon: LogOut, path: 'logout', action: onLogout }
  ];

  const filteredNav = navItems;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2 pb-6 flex items-center justify-around z-50 backdrop-blur-lg bg-opacity-90">
      {filteredNav.map((item) => (
        item.action ? (
          <button
            key={item.label}
            onClick={item.action}
            className="flex flex-col items-center gap-1 p-2 text-slate-400"
          >
            <item.icon size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ) : (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${isActive(item.path)
              ? 'text-indigo-600 dark:text-indigo-400 scale-110'
              : 'text-slate-400'
              }`}
          >
            <item.icon size={22} className={isActive(item.path) ? 'fill-indigo-600/10' : ''} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive(item.path) ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
          </Link>
        )
      ))}
    </nav>
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
    <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 lg:left-auto lg:w-96 max-h-[400px] bg-slate-900 text-slate-300 rounded-[2rem] shadow-2xl border border-white/10 flex flex-col z-[60] overflow-hidden">
      <div className="p-4 bg-slate-800 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-indigo-400" />
          <span className="font-bold text-xs uppercase tracking-widest">Logs</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[9px]">
        {logs.length === 0 && <p className="text-slate-600 p-4 text-center italic">Sem atividade.</p>}
        {logs.map((log, i) => (
          <div key={i} className={`p-2 rounded-xl border ${log.status === 'ERROR' ? 'bg-red-950/30 border-red-900/50 text-red-300' : 'bg-slate-800/40 border-white/5'}`}>
            <div className="flex justify-between mb-1 opacity-60">
              <span className="font-bold">{log.method}</span>
              <span>{log.timestamp}</span>
            </div>
            <pre className="whitespace-pre-wrap overflow-x-auto">
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
  ];

  const filteredNav = navItems;

  return (
    <aside className="w-64 bg-slate-900 dark:bg-black text-slate-300 flex flex-col hidden lg:flex border-r border-slate-800 shrink-0">
      <div className="p-8">
        <div className="flex items-center gap-3 text-white mb-10">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-600/20">
            <TrendingUp size={24} />
          </div>
          <span className="text-2xl font-black tracking-tighter">PromoShare</span>
        </div>
        <nav className="space-y-2">
          {filteredNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${isActive(item.path)
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20'
                : 'hover:bg-white/5 hover:text-white'
                }`}
            >
              <item.icon size={22} className={isActive(item.path) ? 'fill-white/10' : ''} />
              <span className="font-bold text-sm uppercase tracking-widest">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-8">
        <button
          onClick={onLogout}
          className="flex items-center gap-4 w-full px-5 py-4 text-slate-500 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all"
        >
          <LogOut size={22} />
          <span className="font-bold text-sm uppercase tracking-widest">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default App;
