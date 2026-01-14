
import React, { useState } from 'react';
import { Lock, Mail, TrendingUp, Chrome, Github } from 'lucide-react';
import { User } from '../types';
import { MOCK_ADMIN, MOCK_USER } from '../constants';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple demo logic
    if (email.includes('admin')) {
      onLogin(MOCK_ADMIN);
    } else {
      onLogin(MOCK_USER);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-xl shadow-indigo-600/40">
            <TrendingUp size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">PromoShare</h2>
          <p className="mt-2 text-slate-400">Gerenciamento inteligente de ofertas</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">E-mail</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  required
                  type="email" 
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Senha</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  required
                  type="password" 
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                <input type="checkbox" className="rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500" />
                Lembrar-me
              </label>
              <a href="#" className="text-indigo-400 font-bold hover:text-indigo-300">Esqueceu a senha?</a>
            </div>

            <button 
              type="submit"
              className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all"
            >
              Entrar na Plataforma
            </button>
          </form>

          <div className="mt-8">
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 border-t border-white/10"></div>
              <span className="relative px-4 bg-slate-900/0 text-[10px] font-bold text-slate-500 uppercase tracking-widest backdrop-blur-md">ou entrar com</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => onLogin(MOCK_USER)}
                className="flex items-center justify-center gap-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 transition-all font-bold text-sm"
              >
                <Chrome size={18} />
                Google
              </button>
              <button 
                className="flex items-center justify-center gap-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 transition-all font-bold text-sm"
              >
                <Github size={18} />
                GitHub
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm">
          Não tem conta? <a href="#" className="text-indigo-400 font-bold hover:text-indigo-300">Crie sua conta agora</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
