import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { formatDate } from '@/domain/dates';
import { errorMessage } from '@/data/repository';
import { bggDetailsToGameInput, getBGGGameDetails, searchBGGGames, type BGGSearchResult } from '@/integrations/bgg/client';
import type { Game, GameInput, GameWithCopies, MemberId } from '@/domain/types';

const simplify = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Remplace une ancienne fiche (sans source) par la fiche BoardGameGeek du même jeu :
 * la fiche BGG est créée si besoin, puis l'ancienne y est rattachée. Les exemplaires,
 * prêts, historique, favoris et parties suivent ; rien n'est perdu.
 */
const convertToBgg = async (actorId: MemberId, game: Game, bggId: string) => {
  const details = await getBGGGameDetails(bggId);
  if (!details) throw new Error('Fiche introuvable sur BoardGameGeek.');
  await repository.createGame(actorId, bggDetailsToGameInput(details));
  if (game.id !== details.id) await repository.mergeGames(actorId, game.id, details.id);
};

/** Cherche la fiche BGG au nom identique (jeu de base de préférence, même année si connue). */
const proposeBggMatch = async (game: Game): Promise<BGGSearchResult | null> => {
  const results = await searchBGGGames(game.name);
  const same = results.filter((r) => simplify(r.name) === simplify(game.name) && (r.type === 'boardgameexpansion') === game.isExpansion);
  return same.find((r) => game.year && r.year === String(game.year)) ?? same[0] ?? null;
};

/** Choix manuel de la fiche BoardGameGeek correspondant à une ancienne fiche. */
const ChooseBggDialog = ({ game, onClose }: { game: Game | null; onClose: () => void }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<BGGSearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setTerm(game?.name ?? ''); setResults([]); setError(null); }, [game]);

  const search = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null);
    try { setResults(await searchBGGGames(term)); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const choose = async (result: BGGSearchResult) => {
    if (!game || !user) return;
    setBusy(true); setError(null);
    try {
      await convertToBgg(user.id, game, result.id);
      toast.success(`« ${game.name} » utilise maintenant la fiche BoardGameGeek.`);
      await queryClient.invalidateQueries({ queryKey: ['library'] });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(game)} onOpenChange={(open) => { if (!open) onClose(); }} eyebrow="Choisir la fiche BoardGameGeek" title={game?.name ?? ''}
      description="Les exemplaires, prêts et l’historique de ce jeu passeront sur la fiche BoardGameGeek choisie.">
      <form onSubmit={search} className="flex gap-3">
        <label htmlFor="link-search" className="sr-only">Nom du jeu sur BoardGameGeek</label>
        <Input id="link-search" value={term} onChange={(e) => setTerm(e.target.value)} />
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

type Proposal = { status: 'searching' } | { status: 'found'; match: BGGSearchResult } | { status: 'none' } | { status: 'error'; message: string };

/** Anciennes fiches encore utilisées : proposition de fiche BGG et conversion. */
const LegacyConversion = ({ legacy, onChoose }: { legacy: GameWithCopies[]; onChoose: (game: Game) => void }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [proposals, setProposals] = useState<Record<string, Proposal>>({});
  const [converting, setConverting] = useState<string | null>(null);
  const ids = legacy.map((g) => g.id).join('|');

  useEffect(() => {
    let active = true;
    (async () => {
      for (const game of legacy) {
        if (!active) return;
        setProposals((p) => (p[game.id] ? p : { ...p, [game.id]: { status: 'searching' } }));
        try {
          const match = await proposeBggMatch(game);
          if (active) setProposals((p) => ({ ...p, [game.id]: match ? { status: 'found', match } : { status: 'none' } }));
        } catch (e) {
          if (active) setProposals((p) => ({ ...p, [game.id]: { status: 'error', message: errorMessage(e) } }));
        }
        await new Promise((resolve) => setTimeout(resolve, 600)); // on ménage l'API BGG
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const convert = async (games: Game[]) => {
    if (!user) return;
    let ok = 0;
    for (const game of games) {
      const proposal = proposals[game.id];
      if (proposal?.status !== 'found') continue;
      setConverting(game.id);
      try {
        await convertToBgg(user.id, game, proposal.match.id);
        ok += 1;
      } catch (e) {
        toast.error(`${game.name} : ${errorMessage(e)}`);
      }
    }
    setConverting(null);
    await queryClient.invalidateQueries({ queryKey: ['library'] });
    if (ok) toast.success(`${ok} fiche${ok > 1 ? 's converties' : ' convertie'} en fiche${ok > 1 ? 's' : ''} BoardGameGeek.`);
  };

  const ready = legacy.filter((g) => proposals[g.id]?.status === 'found');

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button disabled={ready.length === 0 || converting !== null} onClick={() => void convert(ready)}>
          {converting ? 'Conversion…' : `Tout convertir (${ready.length})`}
        </Button>
        <span className="text-sm text-muted-foreground">Vérifiez d’abord les propositions : année et type de jeu.</span>
      </div>
      <ul className="space-y-3">
        {legacy.map((game) => {
          const p = proposals[game.id];
          return (
            <li key={game.id} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-brun-cafe-doux">
                <p><strong>{game.name}</strong> — {game.copies.length} exemplaire{game.copies.length > 1 ? 's' : ''}</p>
                <p className="text-muted-foreground">
                  {!p || p.status === 'searching' ? 'Recherche sur BoardGameGeek…'
                    : p.status === 'found' ? <>Fiche proposée : <strong className="text-brun-cafe-doux">{p.match.name}</strong> ({p.match.year ?? 'année inconnue'}, {p.match.type === 'boardgameexpansion' ? 'extension' : 'jeu de base'}) · <a className="text-bleu-canard-profond underline" href={`https://boardgamegeek.com/boardgame/${p.match.id}`} target="_blank" rel="noreferrer noopener">voir sur BGG</a></>
                      : p.status === 'none' ? 'Aucune fiche au nom identique : choisissez-la vous-même.'
                        : `Recherche impossible : ${p.message}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {p?.status === 'found' && <Button size="sm" disabled={converting !== null} onClick={() => void convert([game])}>{converting === game.id ? 'Conversion…' : 'Convertir'}</Button>}
                <Button size="sm" variant="outline" disabled={converting !== null} onClick={() => onChoose(game)}>Choisir une autre fiche</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
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
  const [choosing, setChoosing] = useState<Game | null>(null);
  const [filter, setFilter] = useState('');
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [translating, setTranslating] = useState<{ done: number; total: number } | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const update = useLibraryAction((a, input: GameInput) => repository.updateGameDetails(a, input.id!, input), { success: 'Fiche mise à jour depuis BoardGameGeek.' });

  const list = games.data ?? [];
  const bggGames = useMemo(() => list.filter((g) => g.bggId && g.id === g.bggId), [list]);
  const legacyUsed = useMemo(() => list.filter((g) => !(g.bggId && g.id === g.bggId) && g.copies.length > 0), [list]);
  const legacyUnused = useMemo(() => list.filter((g) => !(g.bggId && g.id === g.bggId) && g.copies.length === 0), [list]);
  const untranslated = useMemo(() => list.filter((g) => g.description && !g.descriptionFr), [list]);

  const translateAll = async () => {
    if (!user) return;
    const { translateToFrench } = await import('@/integrations/translate');
    const todo = [...untranslated];
    let ok = 0;
    setTranslating({ done: 0, total: todo.length });
    for (const [index, game] of todo.entries()) {
      try {
        await repository.saveTranslation(user.id, game.id, await translateToFrench(game.description!));
        ok += 1;
      } catch (e) {
        toast.error(`Traduction interrompue (${game.name}) : ${errorMessage(e)}`);
        break;
      }
      setTranslating({ done: index + 1, total: todo.length });
    }
    setTranslating(null);
    await queryClient.invalidateQueries({ queryKey: ['library'] });
    if (ok) toast.success(`${ok} description${ok > 1 ? 's traduites' : ' traduite'} en français.`);
  };

  const shown = bggGames.filter((g) => !filter || g.name.toLowerCase().includes(filter.toLowerCase()));

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

  const deleteUnused = async () => {
    if (!user) return;
    setCleaning(true);
    let ok = 0;
    const kept: string[] = [];
    for (const game of legacyUnused) {
      try { await repository.deleteGame(user.id, game.id); ok += 1; } catch { kept.push(game.name); }
    }
    setCleaning(false);
    await queryClient.invalidateQueries({ queryKey: ['library'] });
    if (ok) toast.success(`${ok} ancienne${ok > 1 ? 's fiches supprimées' : ' fiche supprimée'}.`);
    if (kept.length) toast.info(`Conservées car liées à un historique ou une partie : ${kept.join(', ')}.`);
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
      <PageHeader eyebrow="Administration" title="Fiches de jeux" lead="Toutes les fiches viennent de BoardGameGeek. Ici, vous les gardez à jour ou corrigez une information." />

      {games.isLoading ? <LoadingState /> : games.isError ? <ErrorState error={games.error} onRetry={() => void games.refetch()} /> : (
        <>
          {(legacyUsed.length > 0 || legacyUnused.length > 0) && (
          <section aria-labelledby="legacy" className="mb-10">
            <h2 id="legacy" className="mb-2 font-display text-xl font-bold text-brun-cafe-doux">Anciennes fiches à convertir</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Ces jeux ont été ajoutés avant BoardGameGeek. La conversion remplace leur fiche par celle de BGG ; exemplaires, prêts et historique sont conservés.
            </p>
            {legacyUsed.length > 0 && <LegacyConversion legacy={legacyUsed} onChoose={setChoosing} />}
            {legacyUnused.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>{legacyUnused.length} ancienne{legacyUnused.length > 1 ? 's fiches ne servent' : ' fiche ne sert'} plus (aucun exemplaire).</span>
                <Button size="sm" variant="outline" disabled={cleaning} onClick={() => void deleteUnused()}>{cleaning ? 'Suppression…' : 'Les supprimer'}</Button>
              </div>
            )}
          </section>
          )}

          <section aria-labelledby="all" className="mb-10">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 id="all" className="font-display text-xl font-bold text-brun-cafe-doux">Fiches BoardGameGeek ({bggGames.length})</h2>
              <div className="sm:w-72"><label htmlFor="admin-filter" className="sr-only">Filtrer</label><Input id="admin-filter" placeholder="Filtrer par nom…" value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
            </div>
            {untranslated.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>{untranslated.length} description{untranslated.length > 1 ? 's' : ''} pas encore en français (elles se traduisent aussi toutes seules à la première visite).</span>
                <Button size="sm" variant="outline" disabled={Boolean(translating)} onClick={() => void translateAll()}>
                  {translating ? `Traduction… ${translating.done}/${translating.total}` : 'Tout traduire maintenant'}
                </Button>
              </div>
            )}
            {bggGames.length === 0 ? <p className="rounded-lg border border-dashed border-gris-pierre-chaude p-6 text-sm text-muted-foreground">Aucune fiche pour l’instant.</p> : (
              <div className="surface overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm text-brun-cafe-doux">
                  <thead className="border-b border-gris-pierre-chaude bg-gris-perle/60">
                    <tr><th scope="col" className="p-4">Jeu</th><th scope="col" className="p-4">Exemplaires</th><th scope="col" className="p-4">Actions</th></tr>
                  </thead>
                  <tbody>
                    {shown.map((game) => (
                      <tr key={game.id} className="border-b border-gris-pierre-chaude last:border-0 align-top">
                        <td className="p-4 font-semibold"><Link to={`/game/${encodeURIComponent(game.id)}`} className="hover:underline">{game.name}</Link>{game.isExpansion && <span className="ml-2 text-xs text-bleu-canard-profond">extension</span>}{game.origin === 'manual' && <span className="ml-2 text-xs font-normal text-muted-foreground">corrigée à la main</span>}</td>
                        <td className="p-4">{game.copies.length}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="ghost" disabled={refreshing === game.id} onClick={() => void refreshFromBgg(game)}>{refreshing === game.id ? 'Mise à jour…' : 'Mettre à jour depuis BGG'}</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditing(game)}>Corriger</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
      <ChooseBggDialog game={choosing} onClose={() => setChoosing(null)} />
    </div>
  );
};

export { Admin };
