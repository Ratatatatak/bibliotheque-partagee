// Les migrations doivent pouvoir être rejouées sur une base déjà à jour sans erreur
// et sans modifier les données : l'intégration GitHub de Supabase peut les relancer
// sur la base de production à chaque mise en ligne.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';

const DIR = join(__dirname, '..', 'migrations');
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
const GRANTS = 'GRANT USAGE ON SCHEMA public TO anon, authenticated; GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;';
const A = '11111111-1111-1111-1111-111111111111';

let db: PGlite;
const applyAll = async () => {
  for (const file of FILES) {
    await db.exec(GRANTS);
    try {
      await db.exec(readFileSync(join(DIR, file), 'utf8'));
    } catch (error) {
      throw new Error(`${file} : ${(error as Error).message}`);
    }
  }
};
const snapshot = async () => {
  const tables = ['games', 'game_copies', 'loan_requests', 'loans', 'profiles', 'favorites', 'game_waitlist'];
  const out: Record<string, unknown> = {};
  for (const t of tables) out[t] = (await db.query(`SELECT * FROM public.${t} ORDER BY 1`)).rows;
  return out;
};

beforeAll(async () => {
  db = new PGlite({ extensions: { uuid_ossp } });
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth;
    CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB DEFAULT '{}'::jsonb);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT 'authenticated' $$;
  `);
  await applyAll();
  await db.exec(`
    INSERT INTO auth.users (id, email) VALUES ('${A}', 'a@test.local');
    INSERT INTO public.games (id, name, bgg_id, data_origin) VALUES ('204583', 'Kingdomino', '204583', 'manual');
    INSERT INTO public.game_copies (game_id, owner_id, status) VALUES ('204583', '${A}', 'available');
    INSERT INTO public.favorites (user_id, game_id) VALUES ('${A}', '204583');
    -- Base de test déjà dotée d'un administrateur : rejouer 014 ne doit rien changer.
    UPDATE public.profiles SET role = 'admin' WHERE id = '${A}';
  `);
}, 120_000);

describe('migrations rejouables', () => {
  it('aucune ancienne fiche n’est créée par les migrations', async () => {
    expect((await db.query(`SELECT id FROM public.games WHERE id !~ '^[0-9]+$'`)).rows).toEqual([]);
  });

  it('rejouer toutes les migrations ne provoque aucune erreur et ne change aucune donnée', async () => {
    const before = await snapshot();
    await applyAll();
    await applyAll();
    expect(await snapshot()).toEqual(before);
  }, 120_000);

  it('014 : seuls les comptes du créateur deviennent administrateurs, anciennes fiches inutilisées supprimées', async () => {
    const run014 = () => db.exec(readFileSync(join(DIR, '014_admin_initial_et_nettoyage.sql'), 'utf8'));
    const OWNER = '33333333-3333-3333-3333-333333333333';
    await db.exec(`
      UPDATE public.profiles SET role = 'user';
      INSERT INTO auth.users (id, email) VALUES ('${OWNER}', 'TheoPigaglio@gmail.com');
      INSERT INTO public.games (id, name, min_players, max_players, min_age) VALUES ('catan', 'Catan', 3, 4, 10), ('azul', 'Azul', 2, 4, 8);
      INSERT INTO public.game_copies (game_id, owner_id, status) VALUES ('azul', '${A}', 'available');
      INSERT INTO public.favorites (user_id, game_id) VALUES ('${A}', 'catan');
    `);
    await run014();
    await run014();
    expect((await db.query(`SELECT id, role FROM public.profiles ORDER BY id`)).rows).toEqual([
      { id: A, role: 'user' },
      { id: OWNER, role: 'admin' },
    ]);
    expect((await db.query(`SELECT id FROM public.games ORDER BY id`)).rows.map((r: any) => r.id)).toEqual(['204583', 'azul']);
  });
});
