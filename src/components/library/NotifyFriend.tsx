import { MessageCircle, Send, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { messengerLink, normalizeMessenger, normalizePhone, whatsappLink } from '@/domain/notify';
import type { Member } from '@/domain/types';

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const canShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/**
 * Boutons « Prévenir sur WhatsApp / Messenger » : ouvrent la conversation
 * avec le message déjà rédigé. Rien n'est envoyé sans l'action de la personne.
 */
export const NotifyButtons = ({ recipient, text }: { recipient: Member; text: string }) => {
  const hasPhone = Boolean(normalizePhone(recipient.whatsapp));
  const hasMessenger = Boolean(normalizeMessenger(recipient.messenger));
  const first = recipient.displayName.split(/\s+/)[0];

  const onMessenger = async () => {
    const ok = await copy(text);
    toast.info(ok ? 'Message copié : collez-le dans la conversation Messenger, puis envoyez.' : 'Copiez le message ci-dessous, puis collez-le dans Messenger.');
  };

  const onShare = async () => {
    try { await navigator.share({ text }); } catch { /* partage annulé */ }
  };

  return (
    <div className="space-y-4">
      <blockquote className="whitespace-pre-line rounded-lg border-l-4 border-terre-cuite-chaleureuse bg-gris-perle p-4 text-sm text-brun-cafe-doux">
        {text}
      </blockquote>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button asChild>
          <a href={whatsappLink(recipient.whatsapp, text)} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" /> WhatsApp
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={messengerLink(recipient.messenger)} target="_blank" rel="noopener noreferrer" onClick={() => void onMessenger()}>
            <Send className="mr-2 h-5 w-5" aria-hidden="true" /> Messenger
          </a>
        </Button>
        {canShare() && (
          <Button type="button" variant="ghost" onClick={() => void onShare()}>
            <Share2 className="mr-2 h-5 w-5" aria-hidden="true" /> Autre application
          </Button>
        )}
      </div>
      {(!hasPhone || !hasMessenger) && (
        <p className="text-xs text-muted-foreground">
          {!hasPhone && !hasMessenger
            ? `${first} n’a pas encore renseigné ses coordonnées : vous choisirez vous-même la conversation (ou le groupe).`
            : !hasPhone
              ? `${first} n’a pas renseigné son numéro WhatsApp : vous choisirez la conversation dans WhatsApp.`
              : `${first} n’a pas renseigné son lien Messenger : vous choisirez la conversation dans Messenger.`}
        </p>
      )}
    </div>
  );
};

export type NotifyTarget = { recipient: Member; text: string; title: string };

/** Fenêtre proposée après une action (prêt accepté, refusé…) pour prévenir l'autre personne. */
export const NotifyDialog = ({ target, onClose }: { target: NotifyTarget | null; onClose: () => void }) => (
  <Modal
    open={Boolean(target)}
    onOpenChange={(open) => { if (!open) onClose(); }}
    eyebrow="Prévenir"
    title={target?.title ?? ''}
    description={target ? `Envoyez-lui un petit mot pour que ${target.recipient.displayName.split(/\s+/)[0]} soit au courant.` : undefined}
  >
    {target && (
      <div className="space-y-6">
        <NotifyButtons recipient={target.recipient} text={target.text} />
        <div className="flex justify-end"><Button variant="outline" onClick={onClose}>Terminé</Button></div>
      </div>
    )}
  </Modal>
);
