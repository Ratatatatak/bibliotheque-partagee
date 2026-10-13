import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { repository, useLibraryAction } from '@/hooks/useLibrary';
import { memberLabel, type CopyView } from '@/domain/types';

type OfferedGame = { copyId: string; name: string };

type ExchangeRequestModalProps = {
  requestedGameName: string;
  requestedCopy: CopyView | null;
  offeredGames: OfferedGame[];
  onClose: () => void;
};

/**
 * Proposition d'échange DÉFINITIF : si elle est acceptée, les deux membres
 * deviennent propriétaires du jeu de l'autre. À ne pas confondre avec un prêt.
 */
const ExchangeRequestModal = ({ requestedGameName, requestedCopy, offeredGames, onClose }: ExchangeRequestModalProps) => {
  const [offeredCopyId, setOfferedCopyId] = useState('');
  const [message, setMessage] = useState('');
  const propose = useLibraryAction(
    (actorId, args: { offeredCopyId: string; requestedCopyId: string; message: string | null }) => repository.proposeExchange(actorId, args),
    { success: 'Proposition d’échange envoyée.' },
  );

  useEffect(() => {
    setOfferedCopyId(offeredGames[0]?.copyId ?? '');
    setMessage('');
  }, [requestedCopy, offeredGames]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!requestedCopy || !offeredCopyId) return;
    propose.mutate({ offeredCopyId, requestedCopyId: requestedCopy.id, message: message.trim() || null }, { onSuccess: onClose });
  };

  return (
    <Modal
      open={Boolean(requestedCopy)}
      onOpenChange={(open) => { if (!open) onClose(); }}
      eyebrow="Échange définitif"
      title={`Échanger contre ${requestedGameName}`}
      description={requestedCopy ? <>Propriétaire actuel : <strong>{memberLabel(requestedCopy.owner)}</strong>. Si l’échange est accepté, chacun devient propriétaire du jeu de l’autre.</> : null}
    >
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="offered-copy" className="field-label">Votre jeu proposé en échange</label>
          <select id="offered-copy" value={offeredCopyId} onChange={(event) => setOfferedCopyId(event.target.value)} className="native-select" required>
            {offeredGames.map((game) => <option key={game.copyId} value={game.copyId}>{game.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="exchange-message" className="field-label">Message (facultatif)</label>
          <Input id="exchange-message" value={message} maxLength={500} onChange={(event) => setMessage(event.target.value)} />
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={propose.isLoading || !offeredCopyId}>{propose.isLoading ? 'Envoi…' : 'Envoyer la proposition'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default ExchangeRequestModal;
