
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Loader2, Lock, User, AlertTriangle } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let emailToAuth = username.trim();

    // Lógica de Username: Se não tem @, assume que é apenas o nome
    if (!emailToAuth.includes('@')) {
      // Normalização robusta:
      // 1. Remove todos os espaços (ex: "joao silva" -> "joaosilva")
      // 2. Converte para minúsculo (ex: "Admin" -> "admin")
      // Isso garante que "Admin " ou "ADMIN" funcionem como "admin@parisengenharia.com.br"
      const cleanUsername = emailToAuth.replace(/\s+/g, '').toLowerCase();
      emailToAuth = `${cleanUsername}@parisengenharia.com.br`;
    }

    console.log("Tentativa de login com:", emailToAuth);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password,
      });

      if (error) throw error;
    } catch (err: any) {
      console.error("Erro de login:", err);
      setError('Usuário ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-600/5 blur-[100px]"></div>
          <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-600/5 blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
           <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 shadow-lg">
              <svg viewBox="0 0 100 200" className="h-10 w-auto text-white" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M50 10 L50 40" strokeWidth="10" />
                  <path d="M50 40 Q 45 100 20 190" strokeWidth="10" />
                  <path d="M50 40 Q 55 100 80 190" strokeWidth="10" />
                  <path d="M38 85 L62 85" strokeWidth="10" />
                  <path d="M30 135 L70 135" strokeWidth="10" />
                  <path d="M25 185 Q 50 160 75 185" strokeWidth="8" />
              </svg>
           </div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">CRV<span className="text-blue-600">PARIS</span></h1>
           <p className="text-slate-500 font-medium mt-2 text-sm uppercase tracking-widest">Controle de Frota</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Usuário / Nome</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Digite seu primeiro nome (ex: admin)"
                required
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'ACESSAR SISTEMA'}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Acesse usando apenas seu <strong>Primeiro Nome</strong>.
            <br/>O sistema completará automaticamente.
          </p>
        </div>
      </div>
      
      <div className="mt-8 text-slate-400 text-xs font-medium">
        © 2025 Paris Engenharia. Todos os direitos reservados.
      </div>
    </div>
  );
};

export default Login;
