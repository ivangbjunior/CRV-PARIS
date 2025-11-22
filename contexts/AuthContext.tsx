
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { UserProfile, UserRole } from '../types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Ref para rastrear o ID do usuário carregado e evitar chamadas repetidas ao banco
  // quando o navegador recupera o foco (evento onAuthStateChange)
  const loadedUserId = useRef<string | null>(null);

  // Helper to safe parse role
  const parseRole = (roleRaw: string): UserRole => {
    if (!roleRaw) return UserRole.OPERADOR;
    const normalized = roleRaw.toUpperCase().trim();
    if (Object.values(UserRole).includes(normalized as UserRole)) {
      return normalized as UserRole;
    }
    return UserRole.OPERADOR;
  };

  const fetchUserProfile = async (userId: string, email: string) => {
    try {
      // Timeout de segurança para não travar tela de loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );

      const fetchPromise = supabase
        .from('user_roles')
        .select('*')
        .eq('id', userId)
        .single();

      // Corrida entre fetch e timeout
      const response: any = await Promise.race([fetchPromise, timeoutPromise]);

      if (response.error || !response.data) {
        console.error('Perfil não encontrado ou erro de conexão:', response.error);
        setUser(null);
        loadedUserId.current = null;
      } else {
        const safeRole = parseRole(response.data.role);
        setUser({ id: userId, email, role: safeRole });
        loadedUserId.current = userId; // Marca este ID como carregado com sucesso
      }
    } catch (e) {
      console.error('Erro crítico ou timeout ao buscar perfil', e);
      // Em caso de erro crítico, não assumimos nenhum papel.
      setUser(null);
      loadedUserId.current = null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // 1. Get Session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(session);
          if (session?.user) {
             await fetchUserProfile(session.user.id, session.user.email!);
          } else {
             setLoading(false);
          }
        }
      } catch (error) {
        console.error("Auth init error:", error);
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // 2. Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      setSession(session);
      
      if (session?.user) {
        // CORREÇÃO: Verifica se o usuário já foi carregado para evitar refetch ao mudar de aba
        if (loadedUserId.current === session.user.id) {
            setLoading(false);
            return;
        }

        // Se o usuário mudou ou é login inicial, busca perfil
        await fetchUserProfile(session.user.id, session.user.email!);
      } else {
        setUser(null);
        loadedUserId.current = null;
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setSession(null);
      setUser(null);
      loadedUserId.current = null;
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
