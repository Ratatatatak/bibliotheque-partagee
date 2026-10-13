import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  eyebrow?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Fenêtre modale accessible (focus piégé, fermeture avec Échap, titre annoncé
 * aux lecteurs d'écran), basée sur Radix Dialog.
 */
export const Modal = ({ open, onOpenChange, title, eyebrow, description, children, className }: ModalProps) => (
  <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-brun-cafe-doux/50 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-gris-pierre-chaude bg-card p-6 shadow-lg focus:outline-none sm:p-8',
          className,
        )}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
            <DialogPrimitive.Title className="mt-1 font-display text-2xl font-bold text-brun-cafe-doux">{title}</DialogPrimitive.Title>
            {description && <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">{description}</DialogPrimitive.Description>}
          </div>
          <DialogPrimitive.Close
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-brun-cafe-doux hover:bg-gris-perle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-canard-profond"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);
