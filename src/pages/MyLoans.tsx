import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Loader, Clock, Check, Trash2, MessageSquare, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DatePicker } from '@/components/ui/date-picker';
import { Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { LocalLoan, LocalRequest, readLocalLoans, readLocalRequests, writeLocalLoans, writeLocalRequests } from '@/lib/localWorkspace';

type LoanRequest = {
  id: string;
  game_copy_id: string;
  requester_id: string;
  owner_id: string;
  requested_return_date: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'refused' | 'cancelled';
  created_at: string;
  responded_at: string | null;
  game_copy: {
    id: string;
    game: {
      id: string;
      name: string;
      image_url: string | null;
    };
    owner: {
      id: string;
      email: string;
      user_metadata: {
        full_name: string | null;
        avatar_url: string | null;
      };
    };
  };
  requester: {
    id: string;
    email: string;
    user_metadata: {
      full_name: string | null;
      avatar_url: string | null;
    };
  };
};

type Loan = {
  id: string;
  game_copy_id: string;
  owner_id: string;
  borrower_id: string;
  start_date: string;
  expected_return_date: string;
  actual_return_date: string | null;
  status: 'active' | 'returned';
  created_at: string;
  game_copy: {
    id: string;
    game: {
      id: string;
      name: string;
      image_url: string | null;
    };
    owner: {
      id: string;
      email: string;
      user_metadata: {
        full_name: string | null;
        avatar_url: string | null;
      };
    };
  };
  borrower: {
    id: string;
    email: string;
    user_metadata: {
      full_name: string | null;
      avatar_url: string | null;
    };
  };
};

type ExchangeRequest = {
  id: string;
  proposer_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'refused' | 'cancelled';
  message: string | null;
  created_at: string;
  offered_copy: { game: { name: string; image_url: string | null } };
  requested_copy: { game: { name: string; image_url: string | null } };
};

const MyLoans = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localRequests, setLocalRequests] = useState<LocalRequest[]>(readLocalRequests);
  const [localLoans, setLocalLoans] = useState<LocalLoan[]>(readLocalLoans);

  const respondToLocalRequest = (request: LocalRequest, status: 'accepted' | 'refused') => {
    const nextRequests = localRequests.map(item => status === 'accepted' && item.gameCopyId === request.gameCopyId && item.status === 'pending'
      ? { ...item, status: item.id === request.id ? status : 'refused' as const }
      : item.id === request.id ? { ...item, status } : item);
    setLocalRequests(nextRequests);
    writeLocalRequests(nextRequests);
    if (status === 'accepted') {
      const nextLoans = [...localLoans, { id: `local-loan-${Date.now()}`, requestId: request.id, gameName: request.gameName, ownerName: request.ownerName, borrowerName: request.requesterName, expectedReturnDate: request.requestedReturnDate, actualReturnDate: null, status: 'active', createdAt: new Date().toISOString() }];
      setLocalLoans(nextLoans);
      writeLocalLoans(nextLoans);
    }
    toast.success(status === 'accepted' ? 'Demande acceptée.' : 'Demande refusée.');
  };

  const cancelLocalRequest = (request: LocalRequest) => {
    const nextRequests = localRequests.map(item => item.id === request.id ? { ...item, status: 'cancelled' as const } : item);
    setLocalRequests(nextRequests);
    writeLocalRequests(nextRequests);
    toast.success('Demande annulée.');
  };

  const returnLocalLoan = (loan: LocalLoan) => {
    const nextLoans = localLoans.map(item => item.id === loan.id ? { ...item, status: 'returned' as const, actualReturnDate: new Date().toISOString() } : item);
    setLocalLoans(nextLoans);
    writeLocalLoans(nextLoans);
    toast.success('Jeu marqué comme rendu.');
  };

  const {
    data: loanRequests = [],
    isLoading: requestsLoading,
    error: requestsError,
  } = useQuery({
    queryKey: ['loanRequests'],
    enabled: isSupabaseConfigured && Boolean(user?.id),
    initialData: [],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_requests')
        .select(`
          id,
          game_copy_id,
          requester_id,
          owner_id,
          requested_return_date,
          message,
          status,
          created_at,
          responded_at,
          game_copy:game_copies(
            id,
            game:games(id, name, image_url),
            owner:profiles(id, full_name, avatar_url)
          ),
          requester:profiles(id, full_name, avatar_url)
        `)
        .or(`requester_id.eq.${user?.id},owner_id.eq.${user?.id}`);

      if (error) throw error;
      return data;
    },
  });

  const { data: exchangeRequests = [], error: exchangeError } = useQuery<ExchangeRequest[]>({
    queryKey: ['exchangeRequests', user?.id],
    enabled: isSupabaseConfigured && Boolean(user?.id),
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exchange_requests' as never)
        .select(`
          id, proposer_id, recipient_id, status, message, created_at,
          offered_copy:game_copies!exchange_requests_offered_copy_id_fkey(game:games(name, image_url)),
          requested_copy:game_copies!exchange_requests_requested_copy_id_fkey(game:games(name, image_url))
        ` as never)
        .or(`proposer_id.eq.${user?.id},recipient_id.eq.${user?.id}`);
      if (error) throw error;
      return (data || []) as unknown as ExchangeRequest[];
    },
  });

  const {
    data: loans = [],
    isLoading: loansLoading,
    error: loansError,
  } = useQuery({
    queryKey: ['loans'],
    enabled: isSupabaseConfigured && Boolean(user?.id),
    initialData: [],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select(`
          id,
          game_copy_id,
          owner_id,
          borrower_id,
          start_date,
          expected_return_date,
          actual_return_date,
          status,
          created_at,
          game_copy:game_copies(
            id,
            game:games(id, name, image_url),
            owner:profiles(id, full_name, avatar_url)
          ),
          borrower:profiles(id, full_name, avatar_url)
        `)
        .or(`owner_id.eq.${user?.id},borrower_id.eq.${user?.id}`);

      if (error) throw error;
      return data;
    },
  });

  if (requestsLoading || loansLoading) return <div className="text-center py-12">Chargement...</div>;
  if (requestsError) return <div className="text-center py-12 text-destructive">Erreur demandes: {(requestsError as Error).message}</div>;
  if (loansError) return <div className="text-center py-12 text-destructive">Erreur prêts: {(loansError as Error).message}</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-4">Mes emprunts</h1>
        </div>

        {!exchangeError && exchangeRequests.length > 0 && <section className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Echanges</p><h2 className="mt-1 text-xl font-semibold">Propositions d'échange</h2></div>
            <Badge variant="secondary">{exchangeRequests.filter(request => request.status === 'pending').length} en attente</Badge>
          </div>
          <div className="space-y-3">
            {exchangeRequests.map(request => <div key={request.id} className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-semibold">{request.offered_copy.game.name} <span className="px-1 text-accent">↔</span> {request.requested_copy.game.name}</p><p className="mt-1 text-sm text-muted-foreground">{request.message || 'Proposition envoyée par un membre du groupe.'}</p></div>
              <div className="flex items-center gap-2">
                <Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'accepted' ? 'default' : 'destructive'}>{request.status === 'pending' ? 'En attente' : request.status === 'accepted' ? 'Acceptée' : request.status === 'cancelled' ? 'Annulée' : 'Refusée'}</Badge>
                {request.status === 'pending' && request.recipient_id === user?.id && <><Button size="sm" onClick={async () => { const { error } = await supabase.rpc('accept_exchange_request' as never, { request_id: request.id } as never); if (error) toast.error('Impossible d’accepter cet échange.'); else { toast.success('Échange accepté : les deux jeux ont changé de propriétaire.'); queryClient.invalidateQueries({ queryKey: ['exchangeRequests'] }); queryClient.invalidateQueries({ queryKey: ['myCollection'] }); queryClient.invalidateQueries({ queryKey: ['games'] }); } }}>Accepter</Button><Button size="sm" variant="destructive" onClick={async () => { const { error } = await supabase.from('exchange_requests' as never).update({ status: 'refused', responded_at: new Date().toISOString() } as never).eq('id', request.id); if (error) toast.error('Impossible de refuser cet échange.'); else { toast.success('Proposition refusée.'); queryClient.invalidateQueries({ queryKey: ['exchangeRequests'] }); } }}>Refuser</Button></>}
              </div>
            </div>)}
          </div>
        </section>}

        {!isSupabaseConfigured && <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border bg-card p-5 shadow-sm"><h2 className="text-xl font-semibold">Demandes locales</h2>{localRequests.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Aucune demande pour le moment. Depuis Jeux, choisis un exemplaire disponible.</p> : <div className="mt-4 space-y-3">{[...localRequests].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((request, index) => <div key={request.id} className="rounded-md border p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Priorité {index + 1}</p><h3 className="font-medium">{request.gameName}</h3><p className="text-sm text-muted-foreground">{request.requesterName} demande à {request.ownerName}</p></div><Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'accepted' ? 'default' : 'destructive'}>{request.status === 'pending' ? 'En attente' : request.status === 'accepted' ? 'Acceptée' : request.status === 'cancelled' ? 'Annulée' : 'Refusée'}</Badge></div><p className="mt-3 text-sm">Retour souhaité le {new Date(request.requestedReturnDate).toLocaleDateString('fr-FR')}</p><p className="mt-1 text-sm text-muted-foreground">{request.message}</p>{request.status === 'pending' && <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => respondToLocalRequest(request, 'accepted')}>Accepter</Button><Button size="sm" variant="destructive" onClick={() => respondToLocalRequest(request, 'refused')}>Refuser</Button><Button size="sm" variant="outline" onClick={() => cancelLocalRequest(request)}>Annuler</Button></div>}</div>)}</div>}</section>
          <section className="rounded-lg border bg-card p-5 shadow-sm"><h2 className="text-xl font-semibold">Prêts locaux</h2>{localLoans.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Aucun prêt enregistré.</p> : <div className="mt-4 space-y-3">{localLoans.map(loan => <div key={loan.id} className="rounded-md border p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium">{loan.gameName}</h3><p className="text-sm text-muted-foreground">De {loan.ownerName} à {loan.borrowerName}</p></div><Badge variant={loan.status === 'active' ? 'destructive' : 'default'}>{loan.status === 'active' ? 'En cours' : 'Retourné'}</Badge></div><p className="mt-3 text-sm">Retour prévu le {new Date(loan.expectedReturnDate).toLocaleDateString('fr-FR')}</p>{loan.status === 'active' && <Button className="mt-3" size="sm" variant="outline" onClick={() => returnLocalLoan(loan)}>Marquer comme rendu</Button>}</div>)}</div>}</section>
        </div>}

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {/* Demandes de prêt */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground mb-4">Demandes de prêt</h2>
            {loanRequests.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Aucune demande de prêt.</p>
            ) : (
              <div className="space-y-4">
                {loanRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4 bg-background/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground">
                          {request.game_copy.game.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Demande de{' '}
                          {request.requester_id === user?.id ? (
                            <span className="font-medium">
                              Vous (à {request.game_copy.owner.full_name || 'Utilisateur'})
                            </span>
                          ) : (
                            <span className="font-medium">
                              {request.requester.full_name || 'Utilisateur'} (pour vous)
                            </span>
                          )}
                        </p>
                        {request.message && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Message: {request.message}
                          </p>
                        )}
                      </div>
                      <div className="text-center space-y-2">
                        <Badge
                          variant={
                            request.status === 'pending'
                              ? 'secondary'
                              : request.status === 'accepted'
                              ? 'default'
                              : request.status === 'refused'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {request.status === 'pending'
                            ? 'En attente'
                            : request.status === 'accepted'
                            ? 'Acceptée'
                            : request.status === 'refused'
                            ? 'Refusée'
                            : 'Annulée'}
                        </Badge>
                        {request.status === 'pending' && request.requester_id === user?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                // Annuler la demande (seulement si en attente)
                                const { error } = await supabase
                                  .from('loan_requests')
                                  .delete()
                                  .eq('id', request.id);

                                if (error) throw error;

                                toast.success('Demande annulée avec succès');
                              } catch (err) {
                                console.error('Erreur lors de l\'annulation de la demande:', err);
                                toast.error('Erreur lors de l\'annulation de la demande');
                              }
                            }}
                          >
                            Annuler la demande
                          </Button>
                        )}
                        {request.status === 'pending' && request.owner_id === user?.id && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={async () => {
                                try {
                                  // Mettre à jour la demande pour l'accepter
                                  const { error: acceptError } = await supabase.rpc('accept_loan_request' as never, { request_id: request.id } as never);
                                  if (acceptError) throw acceptError;

                                  toast.success('Demande acceptée et prêt créé avec succès');
                                } catch (err) {
                                  console.error('Erreur lors de l\'acceptation de la demande:', err);
                                  toast.error('Erreur lors de l\'acceptation de la demande');
                                }
                              }}
                            >
                              Accepter
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                try {
                                  // Mettre à jour la demande pour la refuser
                                  const { error } = await supabase
                                    .from('loan_requests')
                                    .update({
                                      status: 'refused',
                                      responded_at: new Date().toISOString()
                                    })
                                    .eq('id', request.id);

                                  if (error) throw error;

                                  toast.success('Demande refusée avec succès');
                                } catch (err) {
                                  console.error('Erreur lors du refus de la demande:', err);
                                  toast.error('Erreur lors du refus de la demande');
                                }
                              }}
                            >
                              Refuser
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 border-t border-border pt-4 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium">Date souhaitée de retour:</span>
                          <p>{new Date(request.requested_return_date).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div>
                          <span className="font-medium">Date de la demande:</span>
                          <p>{new Date(request.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prêts actifs et historiques */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground mb-4">Prêts</h2>
            {loans.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Aucun prêt enregistré.</p>
            ) : (
              <div className="space-y-4">
                {loans.map((loan) => (
                  <div key={loan.id} className="border rounded-lg p-4 bg-background/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground">
                          {loan.game_copy.game.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Prêt de{' '}
                          {loan.borrower_id === user?.id ? (
                            <span className="font-medium">
                              Vous (à {loan.game_copy.owner.full_name || 'Utilisateur'})
                            </span>
                          ) : (
                            <span className="font-medium">
                              {loan.borrower.full_name || 'Utilisateur'} (de vous)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-center space-y-2">
                        <Badge
                          variant={loan.status === 'active' ? 'destructive' : 'default'}
                        >
                          {loan.status === 'active' ? 'En cours' : 'Retourné'}
                        </Badge>
                        {loan.status === 'active' && (loan.borrower_id === user?.id || loan.owner_id === user?.id) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                // Vérifier que l'utilisateur est bien le borrower (celui qui doit retourner)
                                if (loan.borrower_id !== user?.id) {
                                  toast.error('Seul l\'emprunteur peut marquer le prêt comme retourné');
                                  return;
                                }

                                // Marquer le prêt comme retourné
                                const { error } = await supabase.rpc('return_loan' as never, { loan_id: loan.id } as never);
                                if (error) throw error;

                                toast.success('Prêt marqué comme retourné avec succès');
                              } catch (err) {
                                console.error('Erreur lors du marquage du prêt comme retourné:', err);
                                toast.error('Erreur lors du marquage du prêt comme retourné');
                              }
                            }}
                          >
                            Marquer comme retourné
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 border-t border-border pt-4 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium">Date de début:</span>
                          <p>{new Date(loan.start_date).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div>
                          <span className="font-medium">Date prévue de retour:</span>
                          <p>{new Date(loan.expected_return_date).toLocaleDateString('fr-FR')}</p>
                        </div>
                        {loan.actual_return_date && (
                          <div className="mt-2">
                            <span className="font-medium">Date de retour réelle:</span>
                            <p>{new Date(loan.actual_return_date).toLocaleDateString('fr-FR')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { MyLoans };