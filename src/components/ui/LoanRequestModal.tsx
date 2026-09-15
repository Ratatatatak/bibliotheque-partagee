import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { readLocalRequests, writeLocalRequests } from '@/lib/localWorkspace';
import { useAuth } from '@/hooks/useAuth';

interface LoanRequestModalProps {
  gameCopyId: string;
  gameName: string;
  ownerName: string;
  onClose: () => void;
  userId?: string | null;
}

const LoanRequestModal = ({
  gameCopyId,
  gameName,
  ownerName,
  onClose,
  userId
}: LoanRequestModalProps) => {
  const { user } = useAuth();
  const [returnDate, setReturnDate] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnDate) {
      toast.error('Veuillez entrer une date de retour');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isSupabaseConfigured) {
        // Mode démo
        const defaultReturnDate = new Date(returnDate);
        const localRequests = readLocalRequests();
        writeLocalRequests([...localRequests, {
          id: `local-request-${Date.now()}`,
          gameCopyId,
          gameName,
          ownerName,
          requesterName: 'Moi',
          requestedReturnDate: defaultReturnDate.toISOString().slice(0, 10),
          message: message ?? '',
          status: 'pending',
          createdAt: new Date().toISOString(),
        }]);
        toast.success('Demande envoyée.');
        onClose();
        return;
      }

      // Mode Supabase
      // Validate and convert date from DD/MM/YYYY to YYYY-MM-DD for Supabase
      const dateParts = returnDate.split('/');
      if (dateParts.length !== 3) {
        throw new Error('Format de date invalide. Utilisez JJ/MM/AAAA');
      }

      const [day, month, year] = dateParts;

      // Validate that we have valid numbers
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);

      if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum) ||
          dayNum < 1 || dayNum > 31 ||
          monthNum < 1 || monthNum > 12 ||
          yearNum < 1000 || yearNum > 9999) {
        throw new Error('Date invalide. Veuillez entrer une date valide au format JJ/MM/AAAA');
      }

      const formattedReturnDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      const { error } = await supabase.rpc('create_loan_request' as never, {
        requested_copy_id: gameCopyId,
        requested_return_date: formattedReturnDate,
        request_message: message ?? '',
      } as never);

      if (error) throw error;

      toast.success('Demande d\'emprunt envoyée avec succès !');
      onClose();
    } catch (err) {
      console.error('Erreur lors de la création de la demande:', err);
      // Show a more specific error message if it's a validation error
      if (err.message && (err.message.includes('Format de date') || err.message.includes('Date invalide'))) {
        toast.error(err.message);
      } else {
        toast.error('Erreur lors de l\'envoi de la demande. Veuillez réessayer.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="max-w-md w-full max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-primary">Emprunter un jeu</p>
            <h2 className="mt-1 text-xl font-bold">{gameName}</h2>
          </div>
          <button type="button" aria-label="Fermer" className="rounded-md px-3 py-1 text-xl text-muted-foreground hover:bg-muted" onClick={onClose}>
            ×
          </button>
        </div>

        <p className="mb-4 text-muted-foreground">Vous allez emprunter ce jeu à {ownerName}.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Date de retour souhaitée (JJ/MM/AAAA)</label>
            <Input
              type="text"
              placeholder="JJ/MM/AAAA"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Message optionnel pour le propriétaire</label>
            <textarea
              placeholder="Ex: Bonjour, j'aimerais t'emprunter ce jeu ce weekend..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full flex h-10 w-full rounded-md border border-gris-pierre-chaude bg-creme-de-lait px-4 py-3 text-sm text-brun-cafe-doux placeholder:text-brun-cafe-doux/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre-cuite-chaleureuse focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm hover:shadow-md"
              rows={3}
            />
          </div>

          <Button
            type="submit"
            variant="default"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoanRequestModal;