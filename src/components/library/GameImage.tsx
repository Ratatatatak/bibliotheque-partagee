import { useState } from 'react';
import { Dices } from 'lucide-react';
import { cn } from '@/lib/utils';

type GameImageProps = { src: string | null; name: string; className?: string; size?: 'sm' | 'md' | 'lg' };

/**
 * Image de boîte. Si l'image est absente ou ne se charge pas, un visuel neutre
 * est affiché : on n'invente jamais une illustration qui pourrait être prise
 * pour la vraie boîte du jeu.
 */
export const GameImage = ({ src, name, className, size = 'md' }: GameImageProps) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={cn('flex flex-col items-center justify-center gap-2 bg-gris-perle text-center text-brun-cafe-doux/70', className)}
        role="img"
        aria-label={`Image de la boîte de ${name} non disponible`}
      >
        <Dices className={size === 'sm' ? 'h-5 w-5' : 'h-8 w-8'} aria-hidden="true" />
        {size !== 'sm' && <span className="px-2 text-xs font-medium">Image non disponible</span>}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`Boîte du jeu ${name}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('bg-gris-perle object-contain', className)}
    />
  );
};
