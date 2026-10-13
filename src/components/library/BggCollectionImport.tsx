import { FormEvent, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { repository } from '@/hooks/useLibrary';
import { errorMessage } from '@/data/repository';
import { bggDetailsToGameInput, getBGGGamesDetails, getBGGOwnedCollection, type BGGCollectionItem } from '@/integrations/bgg/client';
import { GameImage } from './GameImage';

type Step = 'idle' | 'loading' | 'choose' | 'importing' | 'done';

/**
 * Import en une fois des jeux marqués « possédés » dans la collection
 * BoardGameGeek publique du membre. Chaque jeu est ajouté avec sa fiche BGG
 * complète (source et date conservées), exactement comme un ajout manuel.
 */
export const BggCollectionImport = ({ ownedIds }: { ownedIds: Set<string> }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [items, setItems] = useState<BGGCollectionItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [report, setReport] = useState<{ added: string[]; failed: { name: string; reason: string }[] } | null>(null);

  const newItems = useMemo(() => items.filter((item) => !ownedIds.has(item.id)), [items, ownedIds]);

  const load = async (event: FormEvent) => {
    event.preventDefault();
    setStep('loading');
    setError(null);
    setReport(null);
    try {
      const found = await getBGGOwnedCollection(username);
      setItems(found);
      // Par défaut : tous les jeux de base pas encore présents ; les extensions restent à cocher.
      setSelected(new Set(found.filter((item) => !item.isExpansion && !ownedIds.has(item.id)).map((item) => item.id)));
      setStep('choose');
    } catch (e) {
      setError(errorMessage(e, 'Impossible de lire cette collection BoardGameGeek.'));
      setStep('idle');
    }
  };

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const runImport = async () => {
    if (!user) return;
    const ids = newItems.filter((item) => selected.has(item.id)).map((item) => item.id);
    if (ids.length === 0) return;
    setStep('importing');
    setProgress({ done: 0, total: ids.length });
    const added: string[] = [];
    const failed: { name: string; reason: string }[] = [];
    let details;
    try {
      details = await getBGGGamesDetails(ids);
    } catch (e) {
      setError(errorMessage(e, 'Les fiches BoardGameGeek sont indisponibles. Réessayez plus tard.'));
      setStep('choose');
      return;
    }
    const retrievedAt = new Date().toISOString();
    for (const id of ids) {
      const name = items.find((item) => item.id === id)?.name ?? id;
      const fiche = details.find((d) => d.id === id);
      if (!fiche) {
        failed.push({ name, reason: 'fiche introuvable sur BoardGameGeek' });
      } else {
        try {
          await repository.addGameToCollection(user.id, bggDetailsToGameInput(fiche, retrievedAt));
          added.push(fiche.name || name);
        } catch (e) {
          failed.push({ name, reason: errorMessage(e) });
        }
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    await queryClient.invalidateQueries({ queryKey: ['library'] });
    setReport({ added, failed });
    setStep('done');
    if (added.length) toast.success(`${added.length} jeu${added.length > 1 ? 'x ajoutés' : ' ajouté'} à votre collection.`);
    if (failed.length) toast.error(`${failed.length} jeu${failed.length > 1 ? 'x n’ont' : ' n’a'} pas pu être ajouté${failed.length > 1 ? 's' : ''}.`);
  };

  const selectedCount = newItems.filter((item) => selected.has(item.id)).length;

  return (
    <details className="mt-6 rounded-lg border border-gris-pierre-chaude p-4">
      <summary className="cursor-pointer text-sm font-semibold text-brun-cafe-doux">
        <Download className="mr-2 inline h-4 w-4" aria-hidden="true" />Importer toute ma collection depuis BoardGameGeek
      </summary>
      <p className="mt-2 text-sm text-muted-foreground">
        Indiquez votre pseudo BoardGameGeek : les jeux marqués « possédés » dans votre collection publique sont proposés. Vous choisissez ceux à ajouter.
      </p>
      <form onSubmit={load} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="bgg-username" className="field-label">Pseudo BoardGameGeek</label>
          <Input id="bgg-username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" required disabled={step === 'loading' || step === 'importing'} />
        </div>
        <Button type="submit" variant="outline" disabled={!username.trim() || step === 'loading' || step === 'importing'}>
          {step === 'loading' ? <><Loader2 className="animate-spin" />Lecture… (jusqu’à 1 min)</> : 'Voir ma collection'}
        </Button>
      </form>
      {error && <p className="mt-3 text-sm font-semibold text-destructive" role="alert">{error}</p>}

      {(step === 'choose' || step === 'importing' || step === 'done') && (
        <div className="mt-4 space-y-3" aria-live="polite">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun jeu marqué « possédé » dans cette collection (ou collection privée).</p>
          ) : (
            <>
              <p className="text-sm text-brun-cafe-doux">
                {items.length} jeu{items.length > 1 ? 'x' : ''} trouvé{items.length > 1 ? 's' : ''}, dont {items.length - newItems.length} déjà dans votre collection.
              </p>
              {step === 'choose' && newItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(newItems.map((i) => i.id)))}>Tout cocher</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Tout décocher</Button>
                </div>
              )}
              <ul className="max-h-96 space-y-1 overflow-y-auto rounded-lg border border-gris-pierre-chaude bg-creme-de-lait p-2">
                {items.map((item) => {
                  const owned = ownedIds.has(item.id);
                  return (
                    <li key={item.id}>
                      <label className={`flex min-h-12 items-center gap-3 rounded-md px-2 ${owned ? 'opacity-60' : 'cursor-pointer hover:bg-gris-perle'}`}>
                        <input type="checkbox" className="h-5 w-5 accent-bleu-canard-profond" checked={owned || selected.has(item.id)} disabled={owned || step !== 'choose'} onChange={() => toggle(item.id)} />
                        <GameImage src={item.thumbnail} name={item.name} className="h-10 w-10 shrink-0 rounded" size="sm" />
                        <span className="min-w-0 text-sm text-brun-cafe-doux">
                          <span className="font-semibold">{item.name}</span>
                          <span className="text-muted-foreground"> · {item.year ?? 'année inconnue'}{item.isExpansion ? ' · extension' : ''}{owned ? ' · déjà ajouté' : ''}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {step === 'choose' && (
                <Button onClick={() => void runImport()} disabled={selectedCount === 0}>
                  Ajouter {selectedCount} jeu{selectedCount > 1 ? 'x' : ''} à ma collection
                </Button>
              )}
              {step === 'importing' && (
                <p className="flex items-center gap-2 text-sm font-semibold text-brun-cafe-doux">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Ajout en cours : {progress.done} / {progress.total}
                </p>
              )}
              {step === 'done' && report && (
                <div className="space-y-1 text-sm text-brun-cafe-doux">
                  <p className="font-semibold">{report.added.length} jeu{report.added.length > 1 ? 'x ajoutés' : ' ajouté'}.</p>
                  {report.failed.length > 0 && (
                    <ul className="list-disc pl-6 text-destructive">
                      {report.failed.map((f) => <li key={f.name}>{f.name} : {f.reason}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </details>
  );
};
