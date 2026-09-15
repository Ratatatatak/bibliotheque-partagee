-- Données partagées du groupe : favoris, sources, avis et parties.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS publisher TEXT,
  ADD COLUMN IF NOT EXISTS designers TEXT[],
  ADD COLUMN IF NOT EXISTS illustrators TEXT[],
  ADD COLUMN IF NOT EXISTS published_year INTEGER,
  ADD COLUMN IF NOT EXISTS recommended_players TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT,
  ADD COLUMN IF NOT EXISTS mechanics TEXT[];

CREATE TABLE IF NOT EXISTS public.game_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'other',
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.game_sources ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated users can view game sources' AND polrelid = 'public.game_sources'::regclass) THEN
        CREATE POLICY "Authenticated users can view game sources"
        ON public.game_sources
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated users can add game sources' AND polrelid = 'public.game_sources'::regclass) THEN
        CREATE POLICY "Authenticated users can add game sources"
        ON public.game_sources
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, game_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view their favorites' AND polrelid = 'public.favorites'::regclass) THEN
        CREATE POLICY "Users can view their favorites"
        ON public.favorites
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can add their favorites' AND polrelid = 'public.favorites'::regclass) THEN
        CREATE POLICY "Users can add their favorites"
        ON public.favorites
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can remove their favorites' AND polrelid = 'public.favorites'::regclass) THEN
        CREATE POLICY "Users can remove their favorites"
        ON public.favorites
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.game_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, author_id)
);
ALTER TABLE public.game_reviews ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated users can view reviews' AND polrelid = 'public.game_reviews'::regclass) THEN
        CREATE POLICY "Authenticated users can view reviews"
        ON public.game_reviews
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can add their reviews' AND polrelid = 'public.game_reviews'::regclass) THEN
        CREATE POLICY "Users can add their reviews"
        ON public.game_reviews
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = author_id);
    END IF;
END$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can update their reviews' AND polrelid = 'public.game_reviews'::regclass) THEN
        CREATE POLICY "Users can update their reviews"
        ON public.game_reviews
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = author_id)
        WITH CHECK (auth.uid() = author_id);
    END IF;
END$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can delete their reviews' AND polrelid = 'public.game_reviews'::regclass) THEN
        CREATE POLICY "Users can delete their reviews"
        ON public.game_reviews
        FOR DELETE
        TO authenticated
        USING (auth.uid() = author_id);
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL REFERENCES public.games(id) ON DELETE RESTRICT,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_time TIME,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'played', 'cancelled')),
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated users can view sessions' AND polrelid = 'public.game_sessions'::regclass) THEN
        CREATE POLICY "Authenticated users can view sessions"
        ON public.game_sessions
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can create sessions' AND polrelid = 'public.game_sessions'::regclass) THEN
        CREATE POLICY "Users can create sessions"
        ON public.game_sessions
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = creator_id);
    END IF;
END$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Creators can update sessions' AND polrelid = 'public.game_sessions'::regclass) THEN
        CREATE POLICY "Creators can update sessions"
        ON public.game_sessions
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = creator_id)
        WITH CHECK (auth.uid() = creator_id);
    END IF;
END$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Creators can delete sessions' AND polrelid = 'public.game_sessions'::regclass) THEN
        CREATE POLICY "Creators can delete sessions"
        ON public.game_sessions
        FOR DELETE
        TO authenticated
        USING (auth.uid() = creator_id);
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.session_players (
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, user_id)
);
ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated users can view session players' AND polrelid = 'public.session_players'::regclass) THEN
        CREATE POLICY "Authenticated users can view session players"
        ON public.session_players
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can join sessions' AND polrelid = 'public.session_players'::regclass) THEN
        CREATE POLICY "Users can join sessions"
        ON public.session_players
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can leave sessions' AND polrelid = 'public.session_players'::regclass) THEN
        CREATE POLICY "Users can leave sessions"
        ON public.session_players
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS game_sources_game_id_idx ON public.game_sources(game_id);
CREATE INDEX IF NOT EXISTS favorites_game_id_idx ON public.favorites(game_id);
CREATE INDEX IF NOT EXISTS game_reviews_game_id_idx ON public.game_reviews(game_id);
CREATE INDEX IF NOT EXISTS game_sessions_date_idx ON public.game_sessions(session_date);
CREATE INDEX IF NOT EXISTS session_players_user_id_idx ON public.session_players(user_id);