import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { appMode, supabase } from '@/integrations/supabase/client';
import { addMember } from '@/domain/localState';
import type { Member } from '@/domain/types';
import {
  importLegacyData,
  readCurrentLocalMemberId,
  readLocalState,
  subscribeLocalState,
  updateLocalState,
  writeCurrentLocalMemberId,
} from '@/data/localStore';

/** Personne connectée. En mode local, c'est un profil de démonstration propre à ce navigateur. */
export type AppUser = Member & { email: string | null; isLocal: boolean };

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  mode: 'local' | 'supabase';
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  /** Mode local uniquement : choisir ou créer un profil de démonstration. */
  localSignIn: (memberId: string) => void;
  localCreateMember: (displayName: string, username: string | null) => void;
  refreshProfile: () => Promise<void>;
  /** Envoie un email contenant un lien pour choisir un nouveau mot de passe. */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Change le mot de passe de la personne connectée (ou arrivée par le lien de réinitialisation). */
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (displayName: string, username: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

const readLocalUser = (): AppUser | null => {
  const id = readCurrentLocalMemberId();
  if (!id) return null;
  const member = readLocalState().members.find((item) => item.id === id);
  return member ? { ...member, email: null, isLocal: true } : null;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSupabaseUser = useCallback(async (sessionUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
    if (!sessionUser || !supabase) {
      setUser(null);
      return;
    }
    const meta = sessionUser.user_metadata ?? {};
    const { data: profile } = await supabase.from('profiles').select('full_name, username').eq('id', sessionUser.id).maybeSingle();
    const fullName = (profile?.full_name as string | null) ?? (meta.full_name as string | undefined) ?? null;
    const username = (profile?.username as string | null) ?? (meta.username as string | undefined) ?? null;
    setUser({
      id: sessionUser.id,
      email: sessionUser.email ?? null,
      displayName: fullName || username || sessionUser.email || 'Membre',
      username,
      isLocal: false,
    });
  }, []);

  useEffect(() => {
    if (appMode === 'local') {
      setUser(readLocalUser());
      setLoading(false);
      return subscribeLocalState(() => setUser(readLocalUser()));
    }

    const client = supabase!;
    let active = true;
    client.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) console.error('Impossible de récupérer la session Supabase', error);
        if (active) await loadSupabaseUser(session?.user ?? null);
      })
      .catch((error) => console.error('Erreur lors de la récupération de la session Supabase:', error))
      .finally(() => active && setLoading(false));

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      // Appel différé : on évite d'interroger Supabase pendant le traitement de l'événement d'authentification.
      setTimeout(() => { void loadSupabaseUser(session?.user ?? null); }, 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadSupabaseUser]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    mode: appMode,
    signIn: async (email, password) => {
      if (!supabase) throw new Error('La connexion par email n’est disponible qu’avec Supabase.');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (email, password, fullName, username) => {
      if (!supabase) throw new Error('L’inscription n’est disponible qu’avec Supabase.');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, username } },
      });
      if (error) throw error;
      return { needsConfirmation: !data.session };
    },
    signOut: async () => {
      if (appMode === 'local') {
        writeCurrentLocalMemberId(null);
        return;
      }
      await supabase?.auth.signOut();
    },
    localSignIn: (memberId) => writeCurrentLocalMemberId(memberId),
    localCreateMember: (displayName, username) => {
      const member = updateLocalState((state) => {
        const created = addMember(state, displayName, username);
        // Le tout premier profil local récupère les données de l'ancienne version (sans les effacer).
        const next = state.members.length === 0 ? importLegacyData(created.state, created.member.id) : created.state;
        return { state: next, result: created.member };
      });
      writeCurrentLocalMemberId(member.id);
    },
    updateProfile: async (displayName, username) => {
      const name = displayName.trim();
      const handle = username?.trim() || null;
      if (name.length < 2 || name.length > 40) throw new Error('Le nom doit contenir entre 2 et 40 caractères.');
      if (handle && !/^[\p{L}\p{N}_.-]{3,24}$/u.test(handle)) throw new Error('Le pseudo doit contenir 3 à 24 lettres, chiffres, points, tirets ou soulignés.');
      if (!user) throw new Error('Connectez-vous d’abord.');
      if (appMode === 'local') {
        updateLocalState((state) => {
          if (handle && state.members.some((m) => m.id !== user.id && m.username?.toLowerCase() === handle.toLowerCase())) {
            throw new Error('Ce pseudo est déjà utilisé.');
          }
          return { state: { ...state, members: state.members.map((m) => (m.id === user.id ? { ...m, displayName: name, username: handle } : m)) }, result: undefined };
        });
        setUser(readLocalUser());
        return;
      }
      const { error } = await supabase!.from('profiles').update({ full_name: name, username: handle, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (error) throw new Error(error.code === '23505' ? 'Ce pseudo est déjà utilisé.' : error.message);
      await supabase!.auth.updateUser({ data: { full_name: name, username: handle } });
      const { data } = await supabase!.auth.getUser();
      await loadSupabaseUser(data.user ?? null);
    },
    requestPasswordReset: async (email) => {
      if (!supabase) throw new Error('La réinitialisation n’est disponible qu’avec Supabase.');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
      });
      if (error) throw error;
    },
    updatePassword: async (password) => {
      if (!supabase) throw new Error('Le mot de passe n’est disponible qu’avec Supabase.');
      if (password.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    refreshProfile: async () => {
      if (appMode === 'local') {
        setUser(readLocalUser());
        return;
      }
      const { data } = await supabase!.auth.getUser();
      await loadSupabaseUser(data.user ?? null);
    },
  }), [user, loading, loadSupabaseUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
