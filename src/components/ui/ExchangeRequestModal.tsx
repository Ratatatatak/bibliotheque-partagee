import { useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readLocalRequests, writeLocalRequests } from '@/lib/localWorkspace';

type OfferedGame = { copyId: string; gameId: string; name: string };

type ExchangeRequestModalProps = {
  requestedCopyId: string;
  requestedGameName: string;
  ownerName: string;
  ownerId: string;
  offeredGames: OfferedGame[];
  onClose: () => void;
  onSubmitted: () => void;
};

const ExchangeRequestModal = ({ requestedCopyId, requestedGameName, ownerName, ownerId, offeredGames, onClose, onSubmitted }: ExchangeRequestModalProps) => {
  const { user } = useAuth();
  const [offeredCopyId, setOfferedCopyId] = useState(offeredGames[0]?.copyId || '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !offeredCopyId) return;
    setIsSubmitting(true);
    try {
      const offeredGame = offeredGames.find(game => game.copyId === offeredCopyId);
      if (!offeredGame) throw new Error('Jeu propose introuvable');

      if (!isSupabaseConfigured) {
        const requests = readLocalRequests();
        writeLocalRequests([...requests, {
          id: `local-exchange-${Date.now()}`,
          gameCopyId: requestedCopyId,
          gameName: requestedGameName,
          ownerName,
          requesterName: 'Moi',
          requestedReturnDate: new Date().toISOString().slice(0, 10),
          message: `ECHANGE: je propose ${offeredGame.name}. ${message}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }]);
      } else {
        const { error } = await supabase.from('exchange_requests' as never).insert({
          offered_copy_id: offeredCopyId,
          requested_copy_id: requestedCopyId,
          proposer_id: user.id,
          recipient_id: ownerId,
          message: message || null,
        } as never);
        if (error) throw error;
      }

      toast.success('Proposition d\'echange envoyee.');
      onSubmitted();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la proposition d\'echange:', error);
      toast.error('La proposition n\'a pas pu etre envoyee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-accent"><ArrowRightLeft className="h-4 w-4" /> Proposition d'echange</p>
            <h2 className="mt-2 text-2xl font-bold">Echanger contre {requestedGameName}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Proprietaire : {ownerName}</p>
          </div>
          <button type="button" aria-label="Fermer" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold">Votre jeu propose en echange</label>
            <select value={offeredCopyId} onChange={event => setOfferedCopyId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required>
              {offeredGames.map(game => <option key={game.copyId} value={game.copyId}>{game.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Message (facultatif)</label>
            <Input value={message} onChange={event => setMessage(event.target.value)} placeholder="Bonjour, cet echange pourrait t'interesser..." />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting || !offeredCopyId}>{isSubmitting ? 'Envoi...' : 'Envoyer la proposition'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExchangeRequestModal;
