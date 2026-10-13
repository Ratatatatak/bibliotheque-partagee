import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ExternalLink, Search } from 'lucide-react';
import { useGame } from '@/hooks/useLibrary';
import { GameImage } from '@/components/library/GameImage';
import { CopyList } from '@/components/library/CopyList';
import { EmptyState, ErrorState, LoadingState } from '@/components/library/PageState';
import { useBorrowDialogs } from '@/components/library/useBorrowDialogs';
import { WaitlistButton } from '@/components/library/WaitlistButton';
import { formatDate } from '@/domain/dates';
import { Button } from '@/components/ui/button';

const Fact = ({ label, value }: { label: string; value: string | null }) => (
  <div className="rounded-lg bg-gris-perle p-4">
    <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
    <dd className="mt-1 font-semibold text-brun-cafe-doux">{value ?? <span className="font-normal text-muted-foreground">Non renseigné</span>}</dd>
  </div>
);

const List = ({ label, items }: { label: string; items: string[] }) => (
  items.length ? (
    <div>
      <dt className="text-sm font-bold text-brun-cafe-doux">{label}</dt>
      <dd className="mt-1 text-sm text-muted-foreground">{items.join(', ')}</dd>
    </div>
  ) : null
);

const GameDetail = () => {
  const { id } = useParams<{ id: string }>();
  const game = useGame(id);
  const borrow = useBorrowDialogs();
  const [showAllPublishers, setShowAllPublishers] = useState(false);

  if (game.isLoading) return <LoadingState label="Chargement de la fiche…" />;
  if (game.isError) return <div className="page-container"><ErrorState error={game.error} onRetry={() => void game.refetch()} /></div>;
  if (!game.data) {
    return (
      <div className="page-container">
        <EmptyState icon={<Search className="h-6 w-6" />} title="Jeu introuvable" action={<Button asChild><Link to="/games">Retour à la ludothèque</Link></Button>}>
          Cette fiche n’existe pas ou a été retirée du catalogue du groupe.
        </EmptyState>
      </div>
    );
  }

  const g = game.data;
  const players = g.minPlayers && g.maxPlayers ? (g.minPlayers === g.maxPlayers ? `${g.minPlayers}` : `${g.minPlayers} à ${g.maxPlayers}`) : null;
  const publishers = showAllPublishers ? g.publishers : g.publishers.slice(0, 5);
  const bggSource = g.sources.find((s) => s.name === 'BoardGameGeek');

  return (
    <div className="page-container">
      <Link to="/games" className="mb-6 inline-flex min-h-12 items-center gap-2 font-semibold text-bleu-canard-profond hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à la ludothèque
      </Link>

      <article className="surface overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(240px,360px)_1fr]">
          <GameImage src={g.imageUrl} name={g.name} className="aspect-square w-full rounded-xl" />
          <div className="min-w-0">
            <p className="page-eyebrow">{[g.isExpansion ? 'Extension' : null, g.categories[0], g.year ? String(g.year) : null].filter(Boolean).join(' · ') || 'Jeu de société'}</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-brun-cafe-doux sm:text-4xl">{g.name}</h1>
            {g.originalName && <p className="mt-1 text-muted-foreground">Titre original : {g.originalName}</p>}

            {g.origin === 'legacy-catalog' && (
              <p className="mt-4 flex gap-3 rounded-lg border border-warning-doux bg-warning-doux/15 p-4 text-sm text-brun-cafe-doux" role="note">
                <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
                Ancienne fiche, pas encore remplacée par la fiche BoardGameGeek : ces informations n’ont pas été vérifiées. Un administrateur peut la convertir depuis la page Administration.
              </p>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Fact label="Joueurs" value={players} />
              <Fact label="Durée" value={g.playingTime ? `${g.playingTime} min` : null} />
              <Fact label="Âge" value={g.minAge ? `${g.minAge} ans et +` : null} />
              <Fact label="Année" value={g.year ? String(g.year) : null} />
            </dl>

            <dl className="mt-6 space-y-3">
              <List label="Auteur(s)" items={g.designers} />
              <List label="Illustrateur(s)" items={g.illustrators} />
              {g.publishers.length > 0 && (
                <div>
                  <dt className="text-sm font-bold text-brun-cafe-doux">Éditeurs (toutes éditions confondues, selon la source)</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    {publishers.join(', ')}
                    {g.publishers.length > 5 && (
                      <button type="button" className="ml-2 font-semibold text-bleu-canard-profond underline" onClick={() => setShowAllPublishers((v) => !v)}>
                        {showAllPublishers ? 'Réduire' : `+ ${g.publishers.length - 5} autres`}
                      </button>
                    )}
                  </dd>
                </div>
              )}
              <List label="Catégories" items={g.categories} />
              <List label="Mécanismes" items={g.mechanics} />
            </dl>

            {g.rating && (
              <p className="mt-4 text-sm text-muted-foreground">
                Note moyenne des joueurs sur BoardGameGeek : <strong className="text-brun-cafe-doux">{g.rating.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}/10</strong>
                {g.ratingsCount ? ` (${g.ratingsCount.toLocaleString('fr-FR')} avis)` : ''}
                {bggSource?.retrievedAt ? `, relevée le ${formatDate(bggSource.retrievedAt)}` : ''}.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-gris-pierre-chaude p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold text-brun-cafe-doux">Exemplaires dans le groupe</h2>
          <div className="mt-4">
            <CopyList copies={g.copies} myPendingCopyIds={borrow.myPendingCopyIds} onRequest={borrow.openRequest(g.name)} onExchange={borrow.openExchange?.(g.name)} />
          </div>
          <div className="mt-4"><WaitlistButton game={g} /></div>
        </div>

        <div className="border-t border-gris-pierre-chaude p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold text-brun-cafe-doux">Description</h2>
          {g.description
            ? <div className="mt-3 max-w-3xl whitespace-pre-line text-base leading-7 text-brun-cafe-doux">{g.description}</div>
            : <p className="mt-3 text-muted-foreground">Aucune description disponible.</p>}
          {g.origin === 'bgg' && g.description && <p className="mt-3 text-xs text-muted-foreground">Description en langue originale, telle que publiée sur BoardGameGeek.</p>}
        </div>

        <footer className="border-t border-gris-pierre-chaude bg-gris-perle/60 p-6 text-sm sm:p-8">
          <h2 className="font-bold text-brun-cafe-doux">Sources</h2>
          {g.sources.length ? (
            <ul className="mt-2 space-y-1">
              {g.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-semibold text-bleu-canard-profond underline underline-offset-4">
                    {source.name} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                  <span className="text-muted-foreground">{source.retrievedAt ? ` — données récupérées le ${formatDate(source.retrievedAt)}` : ' — date de récupération inconnue'}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-muted-foreground">Aucune source enregistrée pour cette fiche.</p>}
          {g.origin === 'bgg' && <p className="mt-2 text-xs text-muted-foreground">Données et image fournies par BoardGameGeek (« Powered by BGG »).</p>}
        </footer>
      </article>
      {borrow.dialogs}
    </div>
  );
};

export default GameDetail;
