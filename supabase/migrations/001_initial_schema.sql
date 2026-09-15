-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: games
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'games') THEN
        CREATE TABLE public.games (
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
        CREATE TABLE public.game_copies (
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
        CREATE TABLE public.loan_requests (
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
        CREATE TABLE public.loans (
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

-- Insert seed data if tables are empty (idempotent)
INSERT INTO public.games (id, name, description, image_url, min_players, max_players, duration, min_age, category, created_at)
SELECT
    g->>'id' as id,
    g->>'name' as name,
    g->>'description' as description,
    g->>'image_url' as image_url,
    (g->>'min_players')::int as min_players,
    (g->>'max_players')::int as max_players,
    (g->>'duration')::int as duration,
    (g->>'min_age')::int as min_age,
    g->>'category' as category,
    (g->>'created_at')::timestamptz as created_at
FROM jsonb_array_elements(
    '[{"id":"catan","name":"Catan","description":"Développez votre colonie, échangez vos ressources et construisez la meilleure île.","image_url":"https://x.boardgamearena.net/data/gamemedia/catan/box/en_280.png","min_players":3,"max_players":4,"duration":75,"min_age":10,"category":"Stratégie","created_at":"2024-08-26T00:00:00Z"},{"id":"azul","name":"Azul","description":"Composez une magnifique mosaïque en choisissant vos tuiles avec soin.","image_url":"https://x.boardgamearena.net/data/gamemedia/azul/box/en_280.png","min_players":2,"max_players":4,"duration":45,"min_age":8,"category":"Réflexion","created_at":"2024-08-26T00:00:00Z"},{"id":"dixit","name":"Dixit","description":"Laissez parler votre imagination et devinez l’image secrète du conteur.","image_url":"https://upload.wikimedia.org/wikipedia/commons/9/97/Dixit_game_0001.jpg","min_players":3,"max_players":6,"duration":30,"min_age":8,"category":"Ambiance","created_at":"2024-08-26T00:00:00Z"},{"id":"carcassonne","name":"Carcassonne","description":"Construisez un paysage médiéval en plaçant routes, villes et abbayes.","image_url":"https://x.boardgamearena.net/data/gamemedia/carcassonne/box/en_280.png","min_players":2,"max_players":5,"duration":35,"min_age":7,"category":"Stratégie","created_at":"2024-08-26T00:00:00Z"},{"id":"seven-wonders","name":"7 Wonders","description":"Bâtissez une civilisation et faites prospérer votre merveille à travers les âges.","image_url":"https://x.boardgamearena.net/data/gamemedia/sevenwonders/box/en_280.png","min_players":3,"max_players":7,"duration":30,"min_age":10,"category":"Stratégie","created_at":"2024-08-26T00:00:00Z"},{"id":"splendor","name":"Splendor","description":"Devenez un riche marchand de la Renaissance et attirez les nobles à votre cour.","image_url":"https://x.boardgamearena.net/data/gamemedia/splendor/box/en_280.png","min_players":2,"max_players":4,"duration":30,"min_age":10,"category":"Stratégie","created_at":"2024-08-26T00:00:00Z"},{"id":"pandemic","name":"Pandemic","description":"Coopérez pour sauver le monde avant que quatre maladies ne se propagent.","image_url":"https://x.boardgamearena.net/data/gamemedia/pandemic/box/en_280.png","min_players":2,"max_players":4,"duration":45,"min_age":8,"category":"Coopératif","created_at":"2024-08-26T00:00:00Z"},{"id":"ticket-to-ride","name":"Les Aventuriers du Rail","description":"Reliez les grandes villes par chemin de fer et complétez vos objectifs secrets.","image_url":"https://x.boardgamearena.net/data/gamemedia/tickettoride/box/en_280.png","min_players":2,"max_players":5,"duration":60,"min_age":8,"category":"Famille","created_at":"2024-08-26T00:00:00Z"}]'::jsonb
) as g
ON CONFLICT (id) DO NOTHING;

-- Enable RLS and create policies if they don't exist
DO $$
BEGIN
    -- For games table
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Anyone can view games' AND polrelid = 'public.games'::regclass) THEN
        ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can view games"
        ON public.games
        FOR SELECT
        USING (true);
        CREATE POLICY "Authenticated users can insert games"
        ON public.games
        FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
    END IF;

    -- For game_copies table
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Anyone can view game copies' AND polrelid = 'public.game_copies'::regclass) THEN
        ALTER TABLE public.game_copies ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Anyone can view game copies"
        ON public.game_copies
        FOR SELECT
        USING (true);
        CREATE POLICY "Users can insert their own game copies"
        ON public.game_copies
        FOR INSERT
        WITH CHECK (auth.uid() = owner_id);
        CREATE POLICY "Users can update their own game copies"
        ON public.game_copies
        FOR UPDATE
        USING (auth.uid() = owner_id)
        WITH CHECK (auth.uid() = owner_id);
        CREATE POLICY "Users can delete their own game copies"
        ON public.game_copies
        FOR DELETE
        USING (auth.uid() = owner_id);
    END IF;

    -- For loan_requests table
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view loan requests they are involved in' AND polrelid = 'public.loan_requests'::regclass) THEN
        ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can view loan requests they are involved in"
        ON public.loan_requests
        FOR SELECT
        USING (auth.uid() = requester_id OR auth.uid() = owner_id);
        CREATE POLICY "Users can insert loan requests"
        ON public.loan_requests
        FOR INSERT
        WITH CHECK (auth.uid() = requester_id);
        CREATE POLICY "Owners can update loan requests"
        ON public.loan_requests
        FOR UPDATE
        USING (auth.uid() = owner_id)
        WITH CHECK (auth.uid() = owner_id);
        CREATE POLICY "Users can delete their own loan requests"
        ON public.loan_requests
        FOR DELETE
        USING (auth.uid() = requester_id AND status = 'pending');
    END IF;

    -- For loans table
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view loans they are involved in' AND polrelid = 'public.loans'::regclass) THEN
        ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can view loans they are involved in"
        ON public.loans
        FOR SELECT
        USING (auth.uid() = owner_id OR auth.uid() = borrower_id);
        CREATE POLICY "Only owners can insert loans"
        ON public.loans
        FOR INSERT
        WITH CHECK (auth.uid() = owner_id);
        CREATE POLICY "Owners and borrowers can update loans"
        ON public.loans
        FOR UPDATE
        USING (auth.uid() = owner_id OR auth.uid() = borrower_id)
        WITH CHECK (auth.uid() = owner_id OR auth.uid() = borrower_id);
    END IF;
END$$