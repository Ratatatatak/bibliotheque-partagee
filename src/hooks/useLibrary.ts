import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { appMode } from '@/integrations/supabase/client';
import { localRepository } from '@/data/localRepository';
import { supabaseRepository } from '@/data/supabaseRepository';
import { errorMessage, type LibraryRepository } from '@/data/repository';
import { subscribeLocalState } from '@/data/localStore';
import { useAuth } from './useAuth';

export const repository: LibraryRepository = appMode === 'supabase' ? supabaseRepository : localRepository;

/** Toutes les requêtes de données commencent par cette clé : une action les rafraîchit toutes. */
const ROOT = 'library';

export const libraryKeys = {
  members: [ROOT, 'members'] as const,
  games: [ROOT, 'games'] as const,
  game: (id: string) => [ROOT, 'game', id] as const,
  collection: (memberId: string) => [ROOT, 'collection', memberId] as const,
  activity: (memberId: string) => [ROOT, 'activity', memberId] as const,
  favorites: (memberId: string) => [ROOT, 'favorites', memberId] as const,
  sessions: [ROOT, 'sessions'] as const,
  exchanges: (memberId: string) => [ROOT, 'exchanges', memberId] as const,
};

/** En mode local, rafraîchit l'affichage quand les données changent (y compris dans un autre onglet). */
export const useLocalSync = () => {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (appMode !== 'local') return undefined;
    return subscribeLocalState(() => { void queryClient.invalidateQueries({ queryKey: [ROOT] }); });
  }, [queryClient]);
};

export const useMembers = () => useQuery({ queryKey: libraryKeys.members, queryFn: () => repository.listMembers() });
export const useGames = () => useQuery({ queryKey: libraryKeys.games, queryFn: () => repository.listGames() });
export const useGame = (id: string | undefined) =>
  useQuery({ queryKey: libraryKeys.game(id ?? ''), queryFn: () => repository.getGame(id!), enabled: Boolean(id) });

export const useCollection = () => {
  const { user } = useAuth();
  return useQuery({ queryKey: libraryKeys.collection(user?.id ?? ''), queryFn: () => repository.listCollection(user!.id), enabled: Boolean(user) });
};
export const useMyActivity = () => {
  const { user } = useAuth();
  return useQuery({ queryKey: libraryKeys.activity(user?.id ?? ''), queryFn: () => repository.listMyActivity(user!.id), enabled: Boolean(user) });
};
export const useFavorites = () => {
  const { user } = useAuth();
  return useQuery({ queryKey: libraryKeys.favorites(user?.id ?? ''), queryFn: () => repository.listFavorites(user!.id), enabled: Boolean(user) });
};
export const useSessions = () => useQuery({ queryKey: libraryKeys.sessions, queryFn: () => repository.listSessions() });
export const useExchanges = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: libraryKeys.exchanges(user?.id ?? ''),
    queryFn: () => repository.listExchanges(user!.id),
    enabled: Boolean(user) && repository.supportsExchanges,
  });
};

/**
 * Exécute une action au nom de la personne connectée, affiche un message clair
 * (succès ou erreur) puis rafraîchit toutes les données affichées.
 */
export const useLibraryAction = <TArgs,>(
  action: (actorId: string, args: TArgs) => Promise<void>,
  messages: { success: string | ((args: TArgs) => string); error?: string },
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: TArgs) => {
      if (!user) throw new Error('Connectez-vous pour effectuer cette action.');
      await action(user.id, args);
    },
    onSuccess: (_data, args) => {
      toast.success(typeof messages.success === 'function' ? messages.success(args) : messages.success);
    },
    onError: (error) => {
      toast.error(errorMessage(error, messages.error));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [ROOT] }),
  });
};
