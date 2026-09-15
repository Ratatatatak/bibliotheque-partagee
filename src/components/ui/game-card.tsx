import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface GameCardProps {
  id: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
  minPlayers: number;
  maxPlayers: number;
  duration: number | null;
  minAge: number;
  category: string | null;
  onFavoriteToggle?: (gameId: string) => void;
  isFavorite?: boolean;
  onLoanRequest?: (gameId: string) => void;
}

export const GameCard = ({
  id,
  name,
  imageUrl,
  description,
  minPlayers,
  maxPlayers,
  duration,
  minAge,
  category,
  onFavoriteToggle,
  isFavorite,
  onLoanRequest,
}: GameCardProps) => {
  return (
    <Link
      to={`/game/${id}`}
      className="group block hover:shadow-jeu transition-shadow duration-300"
    >
      <div
        className={cn(
          "bg-creme-de-lait rounded-xl shadow-md border border-gris-pierre-chaude overflow-hidden",
          "hover:-translate-y-2",
          "transition-transform duration-300 ease-out-doux"
        )}
      >
        {/* Image */}
        {imageUrl ? (
          <div className="relative w-full">
            <div className="aspect-[4/3]">
              <img
                src={imageUrl}
                alt={`Boîte de ${name}`}
                className="absolute inset-0 w-full h-full object-cover rounded-t-xl"
              />
            </div>
          </div>
        ) : (
          <div className="w-full aspect-[4/3] bg-terre-cuite-chaleureuse/20 flex items-center justify-center text-terre-cuite-chaleureuse text-sm font-medium">
            Image non disponible
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div>
              {category && (
                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-vert-sauge-doux">
                  {category}
                </p>
              )}
              <Link
                to={`/game/${id}`}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre-cuite-chaleureuse/20"
              >
                <h2 className={cn(
                  "text-title text-brun-cafe-doux transition-colors duration-300 ease-out-doux group-hover:text-terre-cuite-chaleureuse"
                )}>
                  {name}
                </h2>
              </Link>
            </div>
            <Link
              to={`/game/${id}`}
              className="shrink-0 text-xs font-bold uppercase tracking-wider text-terre-cuite-chaleureuse hover:text-terre-cuite-chaleureuse/90"
            >
              Voir la fiche
            </Link>
          </div>

          {description && (
            <p className="mt-2 line-clamp-2 max-w-full text-sm leading-6 text-brun-cafe-doux/60">
              {description}
            </p>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm font-semibold text-brun-cafe-doux/70">
            <div className="flex items-center space-x-2 rounded-xl bg-terre-cuite-chaleureuse/20 p-3">
              <span className="text-xs bg-terre-cuite-chaleureuse/10 text-terre-cuite-chaleureuse font-medium px-2 py-0.5 rounded-full">
                👶
              </span>
              <span>{minAge >= 0 ? `${minAge}+` : 'Tous âges'}</span>
            </div>
            <div className="flex items-center space-x-2 rounded-xl bg-terre-cuite-chaleureuse/20 p-3">
              <span className="text-xs bg-terre-cuite-chaleureuse/10 text-terre-cuite-chaleureuse font-medium px-2 py-0.5 rounded-full">
                👥
              </span>
              <span>{minPlayers}-{maxPlayers}</span>
            </div>
            <div className="flex items-center space-x-2 rounded-xl bg-terre-cuite-chaleureuse/20 p-3">
              <span className="text-xs bg-terre-cuite-chaleureuse/10 text-terre-cuite-chaleureuse font-medium px-2 py-0.5 rounded-full">
                ⏱️
              </span>
              <span>{duration ? `${duration} min` : 'À votre rythme'}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {onFavoriteToggle && (
              <Button
                variant="outline"
                onClick={() => onFavoriteToggle(id)}
                className={isFavorite ? 'bg-terre-cuite-chaleureuse/20 text-terre-cuite-chaleureuse' : ''}
              >
                {isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              </Button>
            )}
            {onLoanRequest && (
              <Button
                variant="ghost"
                onClick={() => onLoanRequest(id)}
              >
                Emprunter ce jeu
              </Button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};