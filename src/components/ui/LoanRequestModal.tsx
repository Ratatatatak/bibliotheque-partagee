import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { repository, useLibraryAction } from '@/hooks/useLibrary';
import { isValidIsoDate, todayIso } from '@/domain/dates';
import { memberLabel, type CopyView } from '@/domain/types';

type LoanRequestModalProps = {
  gameName: string;
  copy: CopyView | null;
  onClose: () => void;
};

const inDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return todayIso(d);
};

const LoanRequestModal = ({ gameName, copy, onClose }: LoanRequestModalProps) => {
  const [returnDate, setReturnDate] = useState(inDays(14));
  const [message, setMessage] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const request = useLibraryAction(
    (actorId, args: { copyId: string; requestedReturnDate: string; message: string }) => repository.createLoanRequest(actorId, args),
    { success: 'Demande envoyée. Le propriétaire la verra dans « Mes prêts ».' },
  );

  useEffect(() => {
    if (copy) {
      setReturnDate(inDays(14));
      setMessage('');
      setDateError(null);
    }
  }, [copy]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!copy) return;
    if (!isValidIsoDate(returnDate)) return setDateError('Choisissez une date valide.');
    if (returnDate < todayIso()) return setDateError('La date de retour ne peut pas être dans le passé.');
    setDateError(null);
    request.mutate({ copyId: copy.id, requestedReturnDate: returnDate, message }, { onSuccess: onClose });
  };

  return (
    <Modal
      open={Boolean(copy)}
      onOpenChange={(open) => { if (!open) onClose(); }}
      eyebrow="Demande d’emprunt"
      title={gameName}
      description={copy ? <>Exemplaire de <strong>{memberLabel(copy.owner)}</strong>. Le prêt ne commence que si le propriétaire accepte.</> : null}
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="return-date" className="field-label">Date de retour souhaitée</label>
          <Input
            id="return-date"
            type="date"
            min={todayIso()}
            value={returnDate}
            onChange={(event) => setReturnDate(event.target.value)}
            aria-invalid={Boolean(dateError)}
            aria-describedby={dateError ? 'return-date-error' : undefined}
            required
          />
          {dateError && <p id="return-date-error" className="mt-2 text-sm font-semibold text-destructive" role="alert">{dateError}</p>}
        </div>
        <div>
          <label htmlFor="loan-message" className="field-label">Message pour le propriétaire (facultatif)</label>
          <textarea
            id="loan-message"
            value={message}
            maxLength={1000}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            placeholder="Ex. : je le récupère samedi chez toi ?"
            className="w-full rounded-md border border-gris-pierre-chaude bg-creme-de-lait px-4 py-3 text-base text-brun-cafe-doux placeholder:text-brun-cafe-doux/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-canard-profond focus-visible:ring-offset-2"
          />
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={request.isLoading}>{request.isLoading ? 'Envoi…' : 'Envoyer la demande'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default LoanRequestModal;
