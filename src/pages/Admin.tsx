import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { repository, useAllGames, useIsAdmin, useLibraryAction } from '@/hooks/useLibrary';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/library/PageState';
import { GameEditDialog } from '@/components/library/GameEditDialog';
import { findDuplicateGames } from '@/domain/localState';
import { formatDate } from '@/domain/dates';
import { errorMessage } from '@/data/repository';
import { bggDetailsToGameInput, getBGGGameDetails, searchBGGGames, type BGGSearchResult } from '@/integrations/bgg/client';
import type { Game, GameInput, GameWithCopies } from '@/domain/types';

const originLabel = (game: Game) => (game.origin === 'bgg' ? 'BoardGameGeek' : game.origin === 'manual' ? 'Corrigée par le groupe' : 'Ancien catalogue (non vérifiée)');

/** Associe une fiche sans source à la fiche BoardGameGeek correspondante. */
const LinkToBggDialog = ({ game, onClose }: { game: Game | null; onClose: () => void }) => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<BGGSearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = useLibraryAction((a, input: GameInput) => repository.updateGameDetails(a, input.id!, input), {
    success: 'Fiche reliée à BoardGameGeek. Si une autre fiche existe pour ce jeu, elle apparaît dans les doublons.',
  });

  const search = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null);
    try { setResults(await searchBGGGames(term)); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const choose = async (result: BGGSearchResult) => {
    if (!game) return;
    setBusy(true); setError(null);
    try {
      const details = await getBGGGameDetails(result.id);
      if (!details) throw new Error('Fiche BoardGameGeek introuvable.');
      link.mutate({ ...bggDetailsToGameInput(details), id: game.id }, { onSuccess: onClose });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(game)} onOpenChange={(open) => { if (!open) { setResults([]); onClose(); } }} eyebrow="Relier à BoardGameGeek" title={game?.name ?? ''}
      description="Les informations de la fiche seront remplacées par celles de BoardGameGeek, avec la source et la date. Les exemplaires et l’historique ne changent pas.">
      <form onSubmit={search} className="flex gap-3">
        <label htmlFor="link-search" className="sr-only">Nom du jeu sur BoardGameGeek</label>
        <Input id="link-search" value={term || game?.name || ''} onChange={(e) => setTerm(e.target.value)} />
        <Button type="submit" variant="outline" disabled={busy}><Search className="h-4 w-4" aria-hidden="true" />Chercher</Button>
      </form>
      {error && <p className="mt-3 text-sm font-semibold text-destructive" role="alert">{error}</p>}
      {busy && <p className="mt-3 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Patientez…</p>}
      <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
        {results.map((r) => (
          <li key={r.id}>
            <button type="button" disabled={busy} onClick={() => void choose(r)} className="flex min-h-12 w-full items-center justify-between rounded-lg border border-gris-pierre-chaude bg-creme-de-lait px-4 text-left hover:border-bleu-canard-profond disabled:opacity-60">
              <span><strong>{r.name}</strong> <span className="text-sm text-muted-foreground">{r.year ?? 'année inconnue'} · {r.type === 'boardgameexpansion' ? 'extension' : 'jeu de base'}</span></span>
              <span className="text-sm font-semibold text-bleu-canard-profond">Choisir</span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
};

const MembersTable = () => {
  const profiles = useQuery({
    queryKey: ['adminProfiles'],
    queryFn: async () => {
      const { data, error } = await supabase!.from('profiles').select('id, full_name, username, role, created_at').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string | null; username: string | null; role: string; created_at: string }[];
    },
  });
  if (profiles.isLoading) return <LoadingState />;
  if (profiles.isError) return <ErrorState error={profiles.error} />;
  return (
    <div className="surface overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm text-brun-cafe-doux">
        <thead className="border-b border-gris-pierre-chaude bg-gris-perle/60"><tr><th scope="col" className="p-4">Nom</th><th scope="col" className="p-4">Pseudo</th><th scope="col" className="p-4">Rôle</th><th scope="col" className="p-4">Inscription</th></tr></thead>
        <tbody>{(profiles.data ?? []).map((p) => (
          <tr key={p.id} className="border-b border-gris-pierre-chaude last:border-0"><td className="p-4">{p.full_name || '—'}</td><td className="p-4">{p.username ? `@${p.username}` : '—'}</td><td className="p-4">{p.role === 'admin' ? 'Administrateur' : 'Membre'}</td><td className="p-4">{formatDate(p.created_at)}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
};

const Admin = () => {
  const { mode } = useAuth();
  const admin = useIsAdmin();
  const games = useAllGames(admin.data === true);
  const [editing, setEditing] = useState<Game | null>(null);
  const [linking, setLinking] = useState<Game | null>(null);
  const [merging, setMerging] = useState<{ source: GameWithCopies; target: GameWithCopies } | null>(null);
  const [deleting, setDeleting] = useState<GameWithCopies | null>(null);
  const [filter, setFilter] = useState('');
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const merge = useLibraryAction((a, args: { sourceId: string; targetId: string }) => repository.mergeGames(a, args.sourceId, args.targetId), { success: 'Fiches fusionnées.' });
  const remove = useLibraryAction((a, gameId: string) => repository.deleteGame(a, gameId), { success: 'Fiche supprimée.' });
  const update = useLibraryAction((a, input: GameInput) => repository.updateGameDetails(a, input.id!, input), { success: 'Fiche mise à jour depuis BoardGameGeek.' });

  const list = games.data ?? [];
  const duplicates = useMemo(() => findDuplicateGames(list).map(([s, t]) => ({
    source: list.find((g) => g.id === s.id)!, target: list.find((g) => g.id === t.id)!,
  })), [list]);
  const shown = list.filter((g) => !filter || g.name.toLowerCase().includes(filter.toLowerCase()));

  const refreshFromBgg = async (game: GameWithCopies) => {
    if (!game.bggId) return;
    setRefreshing(game.id);
    try {
      const details = await getBGGGameDetails(game.bggId);
      if (!details) throw new Error('Fiche introuvable sur BoardGameGeek.');
      update.mutate({ ...bggDetailsToGameInput(details), id: game.id });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRefreshing(null);
    }
  };

  if (admin.isLoading) return <LoadingState />;
  if (!admin.data) {
    return (
      <div className="page-container">
        <EmptyState icon={<ShieldAlert className="h-6 w-6" />} title="Réservé aux administrateurs" action={<Button asChild><Link to="/">Retour à l’accueil</Link></Button>}>
          Demandez à un administrateur du groupe de vous attribuer ce rôle.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader eyebrow="Administration" title="Fiches de jeux" lead="Fusionner les doublons, corriger une fiche ou la mettre à jour depuis BoardGameGeek." />

      {games.isLoading ? <LoadingState /> : games.isError ? <ErrorState error={games.error} onRetry={() => void games.refetch()} /> : (
        <>
          <section aria-labelledby="dups" className="mb-10">
            <h2 id="dups" className="mb-4 font-display text-xl font-bold text-brun-cafe-doux">Doublons probables</h2>
            {duplicates.length === 0 ? <p className="rounded-lg border border-dashed border-gris-pierre-chaude p-6 text-sm text-muted-foreground">Aucun doublon détecté.</p> : (
              <ul className="space-y-3">
                {duplicates.map(({ source, target }) => (
                  <li key={`${source.id}-${target.id}`} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-brun-cafe-doux">
                      <p>Fiche 1 : <strong>{source.name}</strong> — {originLabel(source)}, {source.copies.length} exemplaire{source.copies.length > 1 ? 's' : ''}</p>
                      <p>Fiche 2 : <strong>{target.name}</strong> — {originLabel(target)}, {target.copies.length} exemplaire{target.copies.length > 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => setMerging({ source, target })}>Garder la fiche 2{target.origin === 'bgg' ? ' (BGG)' : ''}</Button>
                      <Button size="sm" variant="outline" onClick={() => setMerging({ source: target, target: source })}>Garder la fiche 1</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="all" className="mb-10">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 id="all" className="font-display text-xl font-bold text-brun-cafe-doux">Toutes les fiches ({list.length})</h2>
              <div className="sm:w-72"><label htmlFor="admin-filter" className="sr-only">Filtrer</label><Input id="admin-filter" placeholder="Filtrer par nom…" value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
            </div>
            <div className="surface overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm text-brun-cafe-doux">
                <thead className="border-b border-gris-pierre-chaude bg-gris-perle/60">
                  <tr><th scope="col" className="p-4">Jeu</th><th scope="col" className="p-4">Origine des informations</th><th scope="col" className="p-4">Exemplaires</th><th scope="col" className="p-4">Actions</th></tr>
                </thead>
                <tbody>
                  {shown.map((game) => (
                    <tr key={game.id} className="border-b border-gris-pierre-chaude last:border-0 align-top">
                      <td className="p-4 font-semibold"><Link to={`/game/${encodeURIComponent(game.id)}`} className="hover:underline">{game.name}</Link>{game.isExpansion && <span className="ml-2 text-xs text-bleu-canard-profond">extension</span>}</td>
                      <td className="p-4">{originLabel(game)}</td>
                      <td className="p-4">{game.copies.length}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditing(game)}>Corriger</Button>
                          {game.bggId
                            ? <Button size="sm" variant="ghost" disabled={refreshing === game.id} onClick={() => void refreshFromBgg(game)}>{refreshing === game.id ? 'Mise à jour…' : 'Mettre à jour depuis BGG'}</Button>
                            : <Button size="sm" variant="ghost" onClick={() => setLinking(game)}>Relier à BGG</Button>}
                          {game.copies.length === 0 && <Button size="sm" variant="ghost" onClick={() => setDeleting(game)}>Supprimer</Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {mode === 'supabase' && (
        <section aria-labelledby="members" className="mb-10">
          <h2 id="members" className="mb-4 font-display text-xl font-bold text-brun-cafe-doux">Membres inscrits</h2>
          <MembersTable />
        </section>
      )}

      <GameEditDialog game={editing} onClose={() => setEditing(null)} />
      <LinkToBggDialog game={linking} onClose={() => setLinking(null)} />
      <Modal open={Boolean(merging)} onOpenChange={(open) => { if (!open) setMerging(null); }} title="Fusionner ces deux fiches ?"
        description={merging ? <>« {merging.source.name} » ({originLabel(merging.source)}) sera fusionnée dans « {merging.target.name} » ({originLabel(merging.target)}). Ses exemplaires, favoris, parties et inscriptions d’attente passent sur la fiche conservée. Un membre qui possède le jeu sur les deux fiches garde un seul exemplaire.</> : null}>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setMerging(null)}>Annuler</Button>
          <Button disabled={merge.isLoading} onClick={() => merging && merge.mutate({ sourceId: merging.source.id, targetId: merging.target.id }, { onSuccess: () => setMerging(null) })}>Fusionner</Button>
        </div>
      </Modal>
      <Modal open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }} title={`Supprimer « ${deleting?.name ?? ''} » ?`} description="Cette fiche n’a aucun exemplaire. Elle sera supprimée définitivement.">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setDeleting(null)}>Garder</Button>
          <Button variant="destructive" disabled={remove.isLoading} onClick={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}>Supprimer</Button>
        </div>
      </Modal>
    </div>
  );
};

export { Admin };
