import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Loader2, Lock, User, AlertTriangle, ArrowRight } from 'lucide-react';
import { ParisLogo } from './ParisLogo';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [capsLockOn, setCapsLockOn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let emailToAuth = username.trim();

    // Normalização: Supabase Auth exige email em minúsculas geralmente
    if (!emailToAuth.includes('@')) {
      const cleanUsername = emailToAuth.replace(/\s+/g, '').toLowerCase();
      emailToAuth = `${cleanUsername}@parisengenharia.com.br`;
    } else {
      emailToAuth = emailToAuth.toLowerCase();
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password,
      });

      if (error) throw error;
    } catch (err: any) {
      console.error("Erro de login:", err);
      setError('Credenciais inválidas. Verifique usuário e senha.');
    } finally {
      setLoading(false);
    }
  };

  const checkCapsLock = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.getModifierState) {
        setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 z-0"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-sm relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Logo Section - Hero */}
        <div className="flex justify-center mb-8">
            <ParisLogo variant="dark" size="xl" />
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-slate-800">Bem-vindo de volta</h2>
            <p className="text-slate-500 text-sm">Insira suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toUpperCase())}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-white/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase font-medium shadow-sm"
                  placeholder="NOME DE USUÁRIO"
                  required
                  autoCapitalize="characters"
                  autoCorrect="off"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={checkCapsLock}
                  onClick={checkCapsLock}
                  onBlur={() => setCapsLockOn(false)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-white/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                  placeholder="SENHA"
                  required
                />
              </div>
              {capsLockOn && (
                  <div className="text-xs text-orange-600 font-bold flex items-center gap-1 animate-in fade-in slide-in-from-top-1 px-1">
                      <AlertTriangle size={12} />
                      CAPS LOCK ATIVADO
                  </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-900/20 text-sm font-bold text-white bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  ACESSAR SISTEMA <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-slate-400 text-xs font-medium">
            © 2025 Paris Engenharia. Sistema de Gestão.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;