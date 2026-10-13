import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { repository, useLibraryAction } from '@/hooks/useLibrary';
import type { Game, GameInput } from '@/domain/types';

type Draft = {
  name: string; originalName: string; year: string; minPlayers: string; maxPlayers: string;
  playingTime: string; minAge: string; categories: string; imageUrl: string; description: string;
};

const toDraft = (game: Game): Draft => ({
  name: game.name,
  originalName: game.originalName ?? '',
  year: game.year ? String(game.year) : '',
  minPlayers: game.minPlayers ? String(game.minPlayers) : '',
  maxPlayers: game.maxPlayers ? String(game.maxPlayers) : '',
  playingTime: game.playingTime ? String(game.playingTime) : '',
  minAge: game.minAge ? String(game.minAge) : '',
  categories: game.categories.join(', '),
  imageUrl: game.imageUrl ?? '',
  description: game.description ?? '',
});

const int = (value: string) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Correction manuelle d'une fiche. Une valeur laissée vide reste « non
 * renseignée » : rien n'est complété automatiquement. Une fiche corrigée à la
 * main est marquée comme saisie par le groupe (ses sources restent listées).
 */
export const GameEditDialog = ({ game, onClose }: { game: Game | null; onClose: () => void }) => {
  const [draft, setDraft] = useState<Draft | null>(null);
  const save = useLibraryAction((a, input: GameInput) => repository.updateGameDetails(a, input.id!, input), { success: 'Fiche mise à jour.' });

  useEffect(() => setDraft(game ? toDraft(game) : null), [game]);

  const field = (key: keyof Draft) => ({
    value: draft?.[key] ?? '',
    onChange: (e: { target: { value: string } }) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!game || !draft) return;
    const input: GameInput = {
      ...game,
      id: game.id,
      name: draft.name.trim(),
      originalName: draft.originalName.trim() || null,
      year: int(draft.year),
      minPlayers: int(draft.minPlayers),
      maxPlayers: int(draft.maxPlayers),
      playingTime: int(draft.playingTime),
      minAge: int(draft.minAge),
      categories: draft.categories.split(',').map((c) => c.trim()).filter(Boolean),
      imageUrl: draft.imageUrl.trim() || null,
      description: draft.description.trim() || null,
      origin: 'manual',
      // Description modifiée : l'ancienne traduction n'est plus valable, elle sera refaite.
      descriptionFr: draft.description.trim() === (game.description ?? '') ? game.descriptionFr ?? null : null,
    };
    save.mutate(input, { onSuccess: onClose });
  };

  return (
    <Modal open={Boolean(game)} onOpenChange={(open) => { if (!open) onClose(); }} eyebrow="Corriger la fiche" title={game?.name ?? ''}
      description="Laissez vide une information inconnue : elle sera affichée « non renseignée ».">
      {draft && (
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label htmlFor="ed-name" className="field-label">Nom</label><Input id="ed-name" required {...field('name')} /></div>
          <div><label htmlFor="ed-orig" className="field-label">Titre original</label><Input id="ed-orig" {...field('originalName')} /></div>
          <div><label htmlFor="ed-year" className="field-label">Année</label><Input id="ed-year" type="number" min={1800} max={2100} {...field('year')} /></div>
          <div><label htmlFor="ed-min" className="field-label">Joueurs minimum</label><Input id="ed-min" type="number" min={1} {...field('minPlayers')} /></div>
          <div><label htmlFor="ed-max" className="field-label">Joueurs maximum</label><Input id="ed-max" type="number" min={1} {...field('maxPlayers')} /></div>
          <div><label htmlFor="ed-time" className="field-label">Durée (minutes)</label><Input id="ed-time" type="number" min={1} {...field('playingTime')} /></div>
          <div><label htmlFor="ed-age" className="field-label">Âge minimum</label><Input id="ed-age" type="number" min={1} {...field('minAge')} /></div>
          <div className="sm:col-span-2"><label htmlFor="ed-cat" className="field-label">Catégories (séparées par des virgules)</label><Input id="ed-cat" {...field('categories')} /></div>
          <div className="sm:col-span-2"><label htmlFor="ed-img" className="field-label">Adresse de l’image de la boîte</label><Input id="ed-img" type="url" {...field('imageUrl')} /></div>
          <div className="sm:col-span-2">
            <label htmlFor="ed-desc" className="field-label">Description</label>
            <textarea id="ed-desc" rows={5} className="w-full rounded-md border border-gris-pierre-chaude bg-creme-de-lait px-4 py-3 text-base text-brun-cafe-doux focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-canard-profond" {...field('description')} />
          </div>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={save.isLoading}>Enregistrer</Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
