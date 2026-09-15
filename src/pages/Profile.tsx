import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { readLocalLoans, readLocalRequests } from '@/lib/localWorkspace';

const Profile = () => {
  const { user: authUser, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const {
    data: user,
    isLoading,
    error,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['profile'],
    enabled: isSupabaseConfigured && Boolean(authUser?.id),
    initialData: null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles' as never)
        .select('*')
        .eq('id', authUser?.id as never)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    },
  });

  useEffect(() => {
    setUsername(user?.username || authUser?.user_metadata?.username || '');
  }, [user?.username, authUser?.user_metadata?.username]);

  const saveUsername = async () => {
    const nextUsername = username.trim();
    if (!authUser || nextUsername.length < 3 || nextUsername.length > 24) {
      toast.error('Le pseudo doit contenir entre 3 et 24 caractères.');
      return;
    }

    setSavingUsername(true);
    try {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { username: nextUsername },
      });
      if (metadataError) throw metadataError;

      const { error: updateError } = await supabase
        .from('profiles' as never)
        .upsert({
          id: authUser.id,
          username: nextUsername,
          full_name: authUser.user_metadata?.full_name || null,
        } as never, { onConflict: 'id' });
      if (updateError) throw updateError;
      await refetchProfile();
      setEditingUsername(false);
      toast.success('Pseudo mis à jour.');
    } catch (updateError) {
      console.error('Erreur lors de la mise à jour du pseudo:', updateError);
      const errorCode = (updateError as { code?: string }).code;
      if (errorCode === 'PGRST204' || errorCode === 'PGRST205') {
        toast.error('La base Supabase doit être mise à jour avec la migration 007_profile_usernames.sql.');
      } else if (errorCode === '23505') {
        toast.error('Ce pseudo est déjà utilisé.');
      } else {
        toast.error('Impossible de mettre à jour le pseudo. Vérifiez votre connexion.');
      }
    } finally {
      setSavingUsername(false);
    }
  };

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['profileStats', authUser?.id],
    enabled: isSupabaseConfigured && Boolean(authUser?.id),
    initialData: { gamesOwned: 0, gamesOnLoan: 0, gamesBorrowed: 0, pendingRequestsReceived: 0, pendingRequestsSent: 0 },
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        // Demo mode: compute from localStorage
        const getCurrentUserCollection = (): any[] => {
          try {
            const saved = localStorage.getItem('bibliotheque-local-collection');
            return saved ? JSON.parse(saved) : [];
          } catch {
            return [];
          }
        };
        const currentUserCollection = getCurrentUserCollection();
        const localLoans = readLocalLoans();
        const localRequests = readLocalRequests();

        const gamesOwned = currentUserCollection.length;

        const gamesOnLoan = localLoans.filter(loan => loan.status === 'active' && loan.ownerName === 'Moi').length;
        const gamesBorrowed = localLoans.filter(loan => loan.status === 'active' && loan.borrowerName === 'Moi').length;

        const pendingRequestsReceived = localRequests.filter(request => request.status === 'pending' && request.ownerName === 'Moi').length;
        const pendingRequestsSent = localRequests.filter(request => request.status === 'pending' && request.requesterName === 'Moi').length;

        return {
          gamesOwned,
          gamesOnLoan,
          gamesBorrowed,
          pendingRequestsReceived,
          pendingRequestsSent,
        };
      } else {
        // Supabase mode: query the database
        const userId = authUser?.id;
        if (!userId) {
          return { gamesOwned: 0, gamesOnLoan: 0, gamesBorrowed: 0, pendingRequestsReceived: 0, pendingRequestsSent: 0 };
        }

        // Games owned: count of game_copies where owner_id = userId
        const { data: gamesOwnedData, error: gamesOwnedError } = await supabase
          .from('game_copies')
          .select('id', { count: 'exact' })
          .eq('owner_id', userId);
        if (gamesOwnedError) throw gamesOwnedError;
        const gamesOwned = gamesOwnedData?.length ?? 0;

        // Active loans where user is owner (games on loan)
        const { data: gamesOnLoanData, error: gamesOnLoanError } = await supabase
          .from('loans')
          .select('id', { count: 'exact' })
          .eq('owner_id', userId)
          .eq('status', 'active');
        if (gamesOnLoanError) throw gamesOnLoanError;
        const gamesOnLoan = gamesOnLoanData?.length ?? 0;

        // Active loans where user is borrower (games borrowed)
        const { data: gamesBorrowedData, error: gamesBorrowedError } = await supabase
          .from('loans')
          .select('id', { count: 'exact' })
          .eq('borrower_id', userId)
          .eq('status', 'active');
        if (gamesBorrowedError) throw gamesBorrowedError;
        const gamesBorrowed = gamesBorrowedData?.length ?? 0;

        // Pending requests received (where user is owner)
        const { data: pendingRequestsReceivedData, error: pendingRequestsReceivedError } = await supabase
          .from('loan_requests')
          .select('id', { count: 'exact' })
          .eq('owner_id', userId)
          .eq('status', 'pending');
        if (pendingRequestsReceivedError) throw pendingRequestsReceivedError;
        const pendingRequestsReceived = pendingRequestsReceivedData?.length ?? 0;

        // Pending requests sent (where user is requester)
        const { data: pendingRequestsSentData, error: pendingRequestsSentError } = await supabase
          .from('loan_requests')
          .select('id', { count: 'exact' })
          .eq('requester_id', userId)
          .eq('status', 'pending');
        if (pendingRequestsSentError) throw pendingRequestsSentError;
        const pendingRequestsSent = pendingRequestsSentData?.length ?? 0;

        return {
          gamesOwned,
          gamesOnLoan,
          gamesBorrowed,
          pendingRequestsReceived,
          pendingRequestsSent,
        };
      }
    },
  });

  if (isLoading) return <div className="text-center py-12">Chargement...</div>;
  if (error) return <div className="text-center py-12 text-destructive">Erreur: {(error as Error).message}</div>;

  const currentUsername = username || user?.username || authUser?.user_metadata?.username || '';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-4">Mon profil</h1>
        </div>

        {!authUser ? (
          <div className="max-w-xl rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Visiteur local</h2>
                <p className="text-muted-foreground">Le mode test fonctionne sans compte.</p>
              </div>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">Les comptes et l'authentification sont désactivés pour le moment. Tu peux parcourir toutes les pages depuis le menu.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <User className="h-12 w-12 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  {currentUsername || user?.user_metadata?.full_name || 'Utilisateur'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{currentUsername ? `@${currentUsername}` : 'Aucun pseudo renseigné'}</p>
                <p className="text-muted-foreground mt-2">
                  {user?.email || ''}
                </p>
              </div>
              <div className="space-y-4">
                {!editingUsername ? <Button variant="outline" onClick={() => setEditingUsername(true)}>Modifier mon pseudo</Button> : <div className="flex max-w-xs flex-col gap-2"><Input value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={24} placeholder="Votre pseudo" /><div className="flex gap-2"><Button onClick={saveUsername} disabled={savingUsername}>{savingUsername ? 'Enregistrement...' : 'Enregistrer'}</Button><Button variant="outline" onClick={() => { setUsername(user?.username || authUser?.user_metadata?.username || ''); setEditingUsername(false); }}>Annuler</Button></div></div>}
                <Button variant="destructive" onClick={async () => {
                  await signOut();
                  toast.success('Vous êtes déconnecté.');
                }}>
                  Se déconnecter
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Statistiques</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <h3 className="text-2xl font-bold text-primary">{stats?.gamesOwned}</h3>
                  <p className="text-sm text-muted-foreground">Jeux possédés</p>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <h3 className="text-2xl font-bold text-primary">{stats?.gamesOnLoan}</h3>
                  <p className="text-sm text-muted-foreground">Prêts en cours</p>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <h3 className="text-2xl font-bold text-primary">{stats?.gamesBorrowed}</h3>
                  <p className="text-sm text-muted-foreground">Prêts effectués</p>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <h3 className="text-2xl font-bold text-primary">{stats?.pendingRequestsReceived}</h3>
                  <p className="text-sm text-muted-foreground">Demandes reçues</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { Profile };