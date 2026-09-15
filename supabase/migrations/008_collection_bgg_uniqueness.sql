-- Un utilisateur ne peut posséder qu'une copie d'un même jeu BGG.
CREATE UNIQUE INDEX IF NOT EXISTS game_copies_owner_game_unique
  ON public.game_copies (owner_id, game_id);