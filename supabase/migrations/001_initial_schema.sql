-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: games
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'games') THEN
        CREATE TABLE IF NOT EXISTS public.games (
            id            TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            description   TEXT,
            image_url     TEXT,
            min_players   INTEGER NOT NULL,
            max_players   INTEGER NOT NULL,
            duration      INTEGER,
            min_age       INTEGER NOT NULL,
            category      TEXT,
            created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
    END IF;
END$$;

-- Table: game_copies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'game_copies') THEN
        CREATE TABLE IF NOT EXISTS public.game_copies (
            id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            game_id       TEXT NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
            owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            status        TEXT NOT NULL DEFAULT 'available',
            created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
    END IF;
END$$;

-- Table: loan_requests
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_requests') THEN
        CREATE TABLE IF NOT EXISTS public.loan_requests (
            id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            game_copy_id          UUID NOT NULL REFERENCES public.game_copies(id) ON DELETE CASCADE,
            requester_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            owner_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            requested_return_date DATE NOT NULL,
            message               TEXT,
            status                TEXT NOT NULL DEFAULT 'pending',
            created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            responded_at          TIMESTAMP WITH TIME ZONE
        );
    END IF;
END$$;

-- Table: loans
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loans') THEN
        CREATE TABLE IF NOT EXISTS public.loans (
            id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            game_copy_id          UUID NOT NULL REFERENCES public.game_copies(id) ON DELETE CASCADE,
            owner_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            borrower_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            start_date            DATE NOT NULL DEFAULT CURRENT_DATE,
            expected_return_date  DATE NOT NULL,
            actual_return_date    DATE,
            status                TEXT NOT NULL DEFAULT 'active',
            created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
    END IF;
END$$;

-- (L'ancien jeu de données de démonstration a été retiré : toutes les fiches viennent de BoardGameGeek.)

-- Enable RLS and create policies if they don't exist
DO $$
BEGIN
    -- For games table
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Anyone can view games' AND polrelid = 'public.games'::regclass) THEN
        ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Anyone can view games" ON public.games;
CREATE POLICY "Anyone can view games"
        ON public.games
        FOR SELECT
        USING (true);
        DROP POLICY IF EXISTS "Authenticated users can insert games" ON public.games;
CREATE POLICY "Authenticated users can insert games"
        ON public.games
        FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
    END IF;

    -- For game_copies table
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Anyone can view game copies' AND polrelid = 'public.game_copies'::regclass) THEN
        ALTER TABLE public.game_copies ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Anyone can view game copies" ON public.game_copies;
CREATE POLICY "Anyone can view game copies"
        ON public.game_copies
        FOR SELECT
        USING (true);
        DROP POLICY IF EXISTS "Users can insert their own game copies" ON public.game_copies;
CREATE POLICY "Users can insert their own game copies"
        ON public.game_copies
        FOR INSERT
        WITH CHECK (auth.uid() = owner_id);
        DROP POLICY IF EXISTS "Users can update their own game copies" ON public.game_copies;
CREATE POLICY "Users can update their own game copies"
        ON public.game_copies
        FOR UPDATE
        USING (auth.uid() = owner_id)
        WITH CHECK (auth.uid() = owner_id);
        DROP POLICY IF EXISTS "Users can delete their own game copies" ON public.game_copies;
CREATE POLICY "Users can delete their own game copies"
        ON public.game_copies
        FOR DELETE
        USING (auth.uid() = owner_id);
    END IF;

    -- For loan_requests table
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view loan requests they are involved in' AND polrelid = 'public.loan_requests'::regclass) THEN
        ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view loan requests they are involved in" ON public.loan_requests;
CREATE POLICY "Users can view loan requests they are involved in"
        ON public.loan_requests
        FOR SELECT
        USING (auth.uid() = requester_id OR auth.uid() = owner_id);
        DROP POLICY IF EXISTS "Users can insert loan requests" ON public.loan_requests;
CREATE POLICY "Users can insert loan requests"
        ON public.loan_requests
        FOR INSERT
        WITH CHECK (auth.uid() = requester_id);
        DROP POLICY IF EXISTS "Owners can update loan requests" ON public.loan_requests;
CREATE POLICY "Owners can update loan requests"
        ON public.loan_requests
        FOR UPDATE
        USING (auth.uid() = owner_id)
        WITH CHECK (auth.uid() = owner_id);
        DROP POLICY IF EXISTS "Users can delete their own loan requests" ON public.loan_requests;
CREATE POLICY "Users can delete their own loan requests"
        ON public.loan_requests
        FOR DELETE
        USING (auth.uid() = requester_id AND status = 'pending');
    END IF;

    -- For loans table
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view loans they are involved in' AND polrelid = 'public.loans'::regclass) THEN
        ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view loans they are involved in" ON public.loans;
CREATE POLICY "Users can view loans they are involved in"
        ON public.loans
        FOR SELECT
        USING (auth.uid() = owner_id OR auth.uid() = borrower_id);
        DROP POLICY IF EXISTS "Only owners can insert loans" ON public.loans;
CREATE POLICY "Only owners can insert loans"
        ON public.loans
        FOR INSERT
        WITH CHECK (auth.uid() = owner_id);
        DROP POLICY IF EXISTS "Owners and borrowers can update loans" ON public.loans;
CREATE POLICY "Owners and borrowers can update loans"
        ON public.loans
        FOR UPDATE
        USING (auth.uid() = owner_id OR auth.uid() = borrower_id)
        WITH CHECK (auth.uid() = owner_id OR auth.uid() = borrower_id);
    END IF;
END$$