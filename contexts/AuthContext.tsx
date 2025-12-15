
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
    let attempts = 0;
    let success = false;
    const maxRetries = 3;

    // Loop de tentativas para robustez contra falhas de rede ou cold start do DB
    while (attempts < maxRetries && !success) {
      attempts++;
      try {
        // Timeout de segurança aumentado para 15s
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 15000)
        );

        const fetchPromise = supabase
          .from('user_roles')
          .select('*')
          .eq('id', userId)
          .single();

        // Corrida entre fetch e timeout
        const response: any = await Promise.race([fetchPromise, timeoutPromise]);

        if (response.error) {
          // Se o erro for "Row not found" (PGRST116), pode ser que o trigger de criação ainda não tenha rodado.
          // Lançamos erro para cair no catch e tentar novamente após delay.
          if (response.error.code === 'PGRST116') {
             console.warn(`Perfil não encontrado na tentativa ${attempts}. Retentando...`);
             throw new Error("Profile not yet created");
          }
          console.error('Erro ao buscar perfil:', response.error);
          throw response.error;
        } 
        
        if (response.data) {
          const safeRole = parseRole(response.data.role);
          setUser({ id: userId, email, role: safeRole });
          loadedUserId.current = userId; // Marca este ID como carregado com sucesso
          success = true;
        }
      } catch (e) {
        console.warn(`Erro na tentativa ${attempts} de ${maxRetries} ao buscar perfil:`, e);
        
        if (attempts < maxRetries) {
          // Espera exponencial: 1s, 2s... antes de tentar de novo
          await new Promise(resolve => setTimeout(resolve, attempts * 1000));
        }
      }
    }

    if (!success) {
      console.error('Falha crítica: Não foi possível carregar o perfil após múltiplas tentativas.');
      // Em caso de falha total, invalidamos o usuário para evitar estado inconsistente
      setUser(null);
      loadedUserId.current = null;
    }
    
    setLoading(false);
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
