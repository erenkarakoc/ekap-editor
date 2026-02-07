'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, UserAttributes } from '@supabase/supabase-js';

import { createClient } from '@shared/lib/supabase/client';
import { signOut as serverSignOut } from '@features/auth/actions';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateUser: (data: UserAttributes) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: User | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        router.push('/editor');
        router.refresh();
        return {};
      } catch {
        return { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' };
      } finally {
        setLoading(false);
      }
    },
    [supabase, router],
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      setLoading(true);
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) return { error: error.message };
        return {};
      } catch {
        return { error: 'Bir hata oluştu. Lütfen tekrar deneyin.' };
      } finally {
        setLoading(false);
      }
    },
    [supabase],
  );

  const signOutFn = useCallback(async () => {
    await supabase.auth.signOut();
    await serverSignOut();
    router.push('/login');
    router.refresh();
  }, [supabase, router]);

  const updateUser = useCallback(
    async (data: UserAttributes): Promise<{ error?: string }> => {
      try {
        const { error } = await supabase.auth.updateUser(data);
        if (error) return { error: error.message };
        return {};
      } catch {
        return { error: 'Bir hata oluştu.' };
      }
    },
    [supabase],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut: signOutFn,
      updateUser,
    }),
    [user, loading, signIn, signUp, signOutFn, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
