import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: string[];
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nomeCompleto: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const lastRolesUserIdRef = useRef<string | null>(null);

  const loadRoles = useCallback(async (userId?: string | null) => {
    if (!userId) {
      setRoles((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const effectiveRolesResult = await supabase.rpc('list_my_roles' as any);
    let data = effectiveRolesResult.data as Array<{ role: string }> | null;
    let error = effectiveRolesResult.error;

    // Compatibilidade durante deploys em que o frontend chega antes da migration.
    if (error) {
      const legacyRolesResult = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      data = legacyRolesResult.data;
      error = legacyRolesResult.error;
    }

    if (error) {
      console.error('Erro ao carregar roles:', error);
      setRoles((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const nextRoles = (data ?? []).map((item) => item.role).sort();
    setRoles((prev) => {
      const prevSorted = [...prev].sort();
      const same =
        prevSorted.length === nextRoles.length &&
        prevSorted.every((role, idx) => role === nextRoles[idx]);
      return same ? prev : nextRoles;
    });
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        const currentUserId = session?.user?.id ?? null;
        if (!currentUserId) {
          lastRolesUserIdRef.current = null;
          setRoles((prev) => (prev.length === 0 ? prev : []));
          return;
        }

        if (lastRolesUserIdRef.current !== currentUserId) {
          lastRolesUserIdRef.current = currentUserId;
          loadRoles(currentUserId);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      const currentUserId = session?.user?.id ?? null;
      if (!currentUserId) {
        lastRolesUserIdRef.current = null;
        setRoles((prev) => (prev.length === 0 ? prev : []));
        return;
      }

      if (lastRolesUserIdRef.current !== currentUserId) {
        lastRolesUserIdRef.current = currentUserId;
        loadRoles(currentUserId);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadRoles]);

  const refreshRoles = useCallback(async () => {
    await loadRoles(user?.id);
  }, [loadRoles, user?.id]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, nomeCompleto: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome_completo: nomeCompleto }
      }
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, signIn, signUp, signOut, refreshRoles }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
