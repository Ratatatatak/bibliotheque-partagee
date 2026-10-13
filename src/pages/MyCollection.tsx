import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Library, Loader2, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { repository, useCollection, useLibraryAction } from '@/hooks/useLibrary';
import { bggService } from '@/lib/bggService';
import { bggDetailsToGameInput, type BGGGameDetails, type BGGSearchResult } from '@/integrations/bgg/client';
import { catalogGameToInput, gameCatalog } from '@/data/gameCatalog';
import { GameImage } from '@/components/library/GameImage';
import { CopyStatusBadge } from '@/components/library/CopyStatusBadge';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/library/PageState';
import { errorMessage } from '@/data/repository';
import { memberLabel, type CopyView, type GameInput } from '@/domain/types';
import { formatDate } from '@/domain/dates';

/** Recherche BGG avec délai de frappe, gestion d'erreur et nouvel essai. */
const BggSearch = ({ ownedIds, onAdd, adding }: { ownedIds: Set<string>; onAdd: (input: GameInput) => void; adding: boolean }) => {
  const [term, setTerm] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<BGGSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BGGSearchResult | null>(null);
  const [details, setDetails] = useState<BGGGameDetails | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) {
      setResults([]); setError(null); setSearching(false);
      return undefined;
    }
    let active = true;
    setSearching(true); setError(null);
    const timer = window.setTimeout(async () => {
      try {
        const found = await bggService.search(query);
        if (active) setResults(found);
      } catch (e) {
        if (active) { setResults([]); setError(errorMessage(e, 'La recherche BoardGameGeek est momentanément indisponible.')); }
      } finally {
        if (active) setSearching(false);
      }
    }, 450);
    return () => { active = false; window.clearTimeout(timer); };
  }, [term, attempt]);

  const select = async (result: BGGSearchResult) => {
    setSelected(result); setDetails(null); setDetailsError(null); setLoadingDetails(true);
    try {
      const found = await bggService.getDetails(result.id);
      if (!found) setDetailsError('BoardGameGeek n’a pas renvoyé de fiche pour ce jeu.');
      setDetails(found);
    } catch (e) {
      setDetailsError(errorMessage(e, 'Fiche indisponible pour le moment.'));
    } finally {
      setLoadingDetails(false);
    }
  };

  const reset = () => { setSelected(null); setDetails(null); setDetailsError(null); };

  return (
    <div>
      <label htmlFor="bgg-search" className="field-label">Rechercher sur BoardGameGeek</label>
      <Input id="bgg-search" value={term} onChange={(e) => { setTerm(e.target.value); reset(); }} placeholder="Ex. : Azul, Les Aventuriers du Rail…" autoComplete="off" startContent={<Search className="h-4 w-4 text-muted-foreground" />} aria-describedby="bgg-status" />
      <div id="bgg-status" className="mt-2 min-h-6 text-sm" aria-live="polite">
        {searching && <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Recherche en cours…</span>}
        {!searching && error && <span className="flex flex-wrap items-center gap-2 font-semibold text-destructive">{error}<Button variant="link" size="sm" onClick={() => setAttempt((a) => a + 1)}>Réessayer</Button></span>}
        {!searching && !error && term.trim().length >= 2 && results.length === 0 && <span className="text-muted-foreground">Aucun jeu trouvé. Essayez le titre original (souvent en anglais).</span>}
      </div>

      {!selected && results.length > 0 && (
        <ul className="mt-2 max-h-96 space-y-2 overflow-y-auto pr-1" aria-label="Résultats BoardGameGeek">
          {results.map((result) => {
            const owned = ownedIds.has(result.id);
            return (
              <li key={result.id}>
                <button type="button" disabled={owned} onClick={() => void select(result)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-gris-pierre-chaude bg-creme-de-lait px-4 py-3 text-left hover:border-terre-cuite-chaleureuse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre-cuite-chaleureuse disabled:cursor-not-allowed disabled:opacity-60">
                  <span className="min-w-0">
                    <span className="block font-semibold text-brun-cafe-doux">{result.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {result.year ?? 'Année inconnue'} · {result.type === 'boardgameexpansion' ? 'Extension' : 'Jeu de base'} · BGG n° {result.id}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-bleu-canard-profond">{owned ? 'Déjà dans votre collection' : 'Voir'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <div className="mt-4 rounded-lg border border-gris-pierre-chaude bg-creme-de-lait p-4">
          {loadingDetails ? <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Chargement de la fiche…</p> : details ? (
            <div className="flex flex-col gap-4 sm:flex-row">
              <GameImage src={details.thumbnail} name={details.name} className="h-28 w-24 shrink-0 rounded-md" size="sm" />
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <p className="font-display text-lg font-bold text-brun-cafe-doux">{details.name}</p>
                <p className="text-muted-foreground">
                  {[details.year, details.type === 'boardgameexpansion' ? 'Extension' : 'Jeu de base',
                    details.minPlayers && details.maxPlayers ? `${details.minPlayers}–${details.maxPlayers} joueurs` : null,
                    details.playingTime ? `${details.playingTime} min` : null].filter(Boolean).join(' · ')}
                </p>
                {details.designers.length > 0 && <p className="text-muted-foreground">Auteur(s) : {details.designers.join(', ')}</p>}
                <p className="text-xs text-muted-foreground">Vérifiez qu’il s’agit bien de votre jeu (et non d’une autre édition ou d’une extension).</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={() => onAdd(bggDetailsToGameInput(details))} disabled={adding}>{adding ? 'Ajout…' : 'Ajouter à ma collection'}</Button>
                  <Button variant="outline" onClick={reset}>Choisir un autre jeu</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-destructive" role="alert">{detailsError}</p>
              <div className="flex gap-2"><Button variant="outline" onClick={() => void select(selected)}>Réessayer</Button><Button variant="ghost" onClick={reset}>Retour aux résultats</Button></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CopyCard = ({ gameId, gameName, imageUrl, copy }: { gameId: string; gameName: string; imageUrl: string | null; copy: CopyView }) => {
  const [notes, setNotes] = useState(copy.notes ?? '');
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const availability = useLibraryAction((actorId, available: boolean) => repository.setCopyAvailability(actorId, copy.id, available), {
    success: (available) => (available ? `${gameName} est de nouveau disponible au prêt.` : `${gameName} n’est plus proposé au prêt.`),
  });
  const saveNotes = useLibraryAction((actorId, value: string) => repository.updateCopyNotes(actorId, copy.id, value), { success: 'Remarque enregistrée.' });
  const remove = useLibraryAction((actorId) => repository.removeCopy(actorId, copy.id), { success: `${gameName} a été retiré de votre collection.` });

  return (
    <li className="surface flex flex-col gap-4 p-4 sm:flex-row sm:p-6">
      <Link to={`/game/${encodeURIComponent(gameId)}`} tabIndex={-1} aria-hidden="true"><GameImage src={imageUrl} name={gameName} className="h-28 w-24 shrink-0 rounded-lg" size="sm" /></Link>
      <div className="min-w-0 flex-1 space-y-2">
        <h2 className="font-display text-lg font-bold text-brun-cafe-doux"><Link to={`/game/${encodeURIComponent(gameId)}`} className="hover:underline">{gameName}</Link></h2>
        <CopyStatusBadge copy={copy} />
        {copy.activeLoan && <p className="text-sm text-brun-cafe-doux">Prêté à <strong>{memberLabel(copy.activeLoan.borrower)}</strong> depuis le {formatDate(copy.activeLoan.startDate)}. <Link to="/my-loans" className="font-semibold text-bleu-canard-profond underline">Gérer le prêt</Link></p>}
        {copy.pendingRequestCount > 0 && <p className="text-sm font-semibold text-brun-cafe-doux">{copy.pendingRequestCount} demande{copy.pendingRequestCount > 1 ? 's' : ''} en attente — <Link to="/my-loans" className="text-bleu-canard-profond underline">répondre</Link></p>}
        {editing ? (
          <div className="space-y-2">
            <label htmlFor={`notes-${copy.id}`} className="field-label">Remarque visible par le groupe (état, pièces manquantes…)</label>
            <textarea id={`notes-${copy.id}`} rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-md border border-gris-pierre-chaude bg-creme-de-lait px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre-cuite-chaleureuse" />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveNotes.mutate(notes, { onSuccess: () => setEditing(false) })} disabled={saveNotes.isLoading}>Enregistrer</Button>
              <Button size="sm" variant="ghost" onClick={() => { setNotes(copy.notes ?? ''); setEditing(false); }}>Annuler</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{copy.notes ? `Remarque : ${copy.notes}` : 'Aucune remarque.'} <button type="button" className="font-semibold text-bleu-canard-profond underline" onClick={() => setEditing(true)}>Modifier</button></p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-start gap-2 sm:flex-col">
        {copy.status !== 'lent' && (
          <Button size="sm" variant="outline" disabled={availability.isLoading} onClick={() => availability.mutate(copy.status !== 'available')}>
            {copy.status === 'available' ? 'Ne plus prêter pour l’instant' : 'Rendre disponible'}
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={copy.status === 'lent'} title={copy.status === 'lent' ? 'Impossible pendant un prêt' : undefined} onClick={() => setConfirmRemove(true)}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />Retirer
        </Button>
      </div>
      <Modal open={confirmRemove} onOpenChange={setConfirmRemove} title={`Retirer ${gameName} ?`} description="Le jeu ne sera plus proposé au groupe. L’historique des prêts passés est conservé.">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setConfirmRemove(false)}>Garder</Button>
          <Button variant="destructive" disabled={remove.isLoading} onClick={() => remove.mutate(undefined, { onSuccess: () => setConfirmRemove(false) })}>Retirer de ma collection</Button>
        </div>
      </Modal>
    </li>
  );
};

const MyCollection = () => {
  const collection = useCollection();
  const [legacyId, setLegacyId] = useState('');
  const add = useLibraryAction((actorId, input: GameInput) => repository.addGameToCollection(actorId, input), {
    success: (input) => `${input.name} a été ajouté à votre collection.`,
  });

  const ownedIds = useMemo(() => new Set((collection.data ?? []).map((g) => g.id)), [collection.data]);
  const copies = (collection.data ?? []).flatMap((game) => game.copies.map((copy) => ({ game, copy })));

  return (
    <div className="page-container">
      <PageHeader eyebrow="Ma collection" title="Mes jeux" lead="Les jeux que vous possédez et que vous pouvez prêter au groupe." />

      <section aria-labelledby="add-title" className="surface mb-10 p-4 sm:p-6">
        <h2 id="add-title" className="mb-4 font-display text-xl font-bold text-brun-cafe-doux">Ajouter un jeu</h2>
        <BggSearch ownedIds={ownedIds} adding={add.isLoading} onAdd={(input) => add.mutate(input)} />
        <details className="mt-6 rounded-lg border border-dashed border-gris-pierre-chaude p-4">
          <summary className="cursor-pointer text-sm font-semibold text-brun-cafe-doux">BoardGameGeek indisponible ? Choisir dans l’ancien catalogue (non vérifié)</summary>
          <p className="mt-2 text-sm text-muted-foreground">Ces fiches proviennent d’une ancienne liste de l’application, sans source vérifiée. Préférez la recherche BoardGameGeek quand elle fonctionne.</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="legacy" className="sr-only">Jeu de l’ancien catalogue</label>
            <select id="legacy" className="native-select" value={legacyId} onChange={(e) => setLegacyId(e.target.value)}>
              <option value="">Sélectionnez un jeu…</option>
              {[...gameCatalog].sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((g) => (
                <option key={g.id} value={g.id} disabled={ownedIds.has(g.id)}>{g.name}{ownedIds.has(g.id) ? ' (déjà ajouté)' : ''}</option>
              ))}
            </select>
            <Button disabled={!legacyId || add.isLoading} onClick={() => {
              const legacy = gameCatalog.find((g) => g.id === legacyId);
              if (legacy) add.mutate(catalogGameToInput(legacy), { onSuccess: () => setLegacyId('') });
            }}>Ajouter</Button>
          </div>
        </details>
      </section>

      {collection.isLoading ? <LoadingState /> : collection.isError ? <ErrorState error={collection.error} onRetry={() => void collection.refetch()} /> : copies.length === 0 ? (
        <EmptyState icon={<Library className="h-6 w-6" />} title="Votre collection est vide">Recherchez un de vos jeux ci-dessus pour le proposer au groupe.</EmptyState>
      ) : (
        <>
          <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4" aria-hidden="true" />{copies.length} jeu{copies.length > 1 ? 'x' : ''} dans votre collection</p>
          <ul className="space-y-4">
            {copies.map(({ game, copy }) => <CopyCard key={copy.id} gameId={game.id} gameName={game.name} imageUrl={game.thumbnailUrl ?? game.imageUrl} copy={copy} />)}
          </ul>
        </>
      )}
    </div>
  );
};

export default MyCollection;
