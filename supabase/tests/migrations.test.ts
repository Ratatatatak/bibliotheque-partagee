// Tests des migrations et des règles de sécurité Supabase, exécutés dans une
// vraie base PostgreSQL embarquée (PGlite), sans toucher à la base réelle du groupe.
//
// Le schéma « auth » de Supabase est simulé : auth.uid() lit l'identifiant de la
// personne connectée dans un réglage de session, comme le fait Supabase.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

const AUTH_STUB = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB DEFAULT '{}'::jsonb);
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
    $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS
    $$ SELECT CASE WHEN auth.uid() IS NULL THEN 'anon' ELSE 'authenticated' END $$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated;
`;

// Droits par défaut accordés par Supabase sur le schéma public.
const SUPABASE_GRANTS = `
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
`;

const ALICE = '11111111-1111-1111-1111-111111111111';
const BRUNO = '22222222-2222-2222-2222-222222222222';
const CHLOE = '33333333-3333-3333-3333-333333333333';

let db: PGlite;

/** Exécute une requête en tant que membre connecté (ou visiteur anonyme si userId = null). */
const as = async <T = Record<string, unknown>>(userId: string | null, sql: string, params: unknown[] = []) => {
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub', '${userId ?? ''}', false); SET ROLE ${userId ? 'authenticated' : 'anon'};`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('RESET ROLE;');
  }
};

const expectError = async (promise: Promise<unknown>, pattern: RegExp) => {
  await expect(promise).rejects.toThrow(pattern);
};

beforeAll(async () => {
  db = new PGlite({ extensions: { uuid_ossp } });
  await db.exec(AUTH_STUB);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    await db.exec(SUPABASE_GRANTS);
    try {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
    } catch (error) {
      throw new Error(`Échec de la migration ${file} : ${(error as Error).message}`);
    }
  }
  await db.exec(SUPABASE_GRANTS);
  // Rejouer 010 vérifie qu'elle est idempotente.
  await db.exec(readFileSync(join(MIGRATIONS_DIR, '010_loan_integrity_and_privacy.sql'), 'utf8'));

  await db.exec(`
    INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
      ('${ALICE}', 'alice@test.local', '{"full_name":"Alice","username":"alice"}'),
      ('${BRUNO}', 'bruno@test.local', '{"full_name":"Bruno","username":"bruno"}'),
      ('${CHLOE}', 'chloe@test.local', '{"full_name":"Chloé","username":"chloe"}');
  `);
}, 120_000);

describe('migrations', () => {
  it('créent les profils automatiquement à l’inscription', async () => {
    const rows = await as(ALICE, 'SELECT id, full_name, username FROM public.profiles ORDER BY full_name');
    expect(rows.map((r) => r.username)).toEqual(['alice', 'bruno', 'chloe']);
  });

  it('le catalogue n’est pas lisible sans être connecté', async () => {
    expect(await as(null, 'SELECT id FROM public.games')).toEqual([]);
    expect(await as(null, 'SELECT id FROM public.game_copies')).toEqual([]);
    expect((await as(ALICE, 'SELECT id FROM public.games')).length).toBeGreaterThan(0);
  });
});

describe('inventaire et prêts', () => {
  let aliceCopy: string;
  let brunoCopy: string;

  beforeAll(async () => {
    await as(ALICE, `INSERT INTO public.games (id, name, min_players, max_players, min_age, bgg_id) VALUES ('230802', 'Azul', 2, 4, 8, '230802')`);
    // Bruno ajoute le même jeu : la fiche existe déjà, il ajoute seulement son exemplaire.
    aliceCopy = (await as<{ id: string }>(ALICE, `INSERT INTO public.game_copies (game_id, owner_id) VALUES ('230802', $1) RETURNING id`, [ALICE]))[0].id;
    brunoCopy = (await as<{ id: string }>(BRUNO, `INSERT INTO public.game_copies (game_id, owner_id) VALUES ('230802', $1) RETURNING id`, [BRUNO]))[0].id;
  });

  it('une fiche peut laisser vides les informations inconnues', async () => {
    await as(BRUNO, `INSERT INTO public.games (id, name, bgg_id) VALUES ('999', 'Jeu sans infos', '999')`);
    const row = (await as(BRUNO, `SELECT min_players, max_players, min_age FROM public.games WHERE id = '999'`))[0];
    expect(row).toEqual({ min_players: null, max_players: null, min_age: null });
  });

  it('un même jeu peut avoir plusieurs propriétaires, mais pas deux fois le même', async () => {
    const owners = await as(CHLOE, `SELECT owner_id FROM public.game_copies WHERE game_id = '230802' ORDER BY owner_id`);
    expect(owners.map((o) => o.owner_id)).toEqual([ALICE, BRUNO]);
    await expectError(as(ALICE, `INSERT INTO public.game_copies (game_id, owner_id) VALUES ('230802', $1)`, [ALICE]), /duplicate key|unique/i);
  });

  it('on ne peut pas créer un exemplaire pour quelqu’un d’autre ni déjà « prêté »', async () => {
    await expectError(as(CHLOE, `INSERT INTO public.game_copies (game_id, owner_id) VALUES ('230802', $1)`, [ALICE]), /row-level security/i);
    await expectError(as(CHLOE, `INSERT INTO public.game_copies (game_id, owner_id, status) VALUES ('230802', $1, 'lent')`, [CHLOE]), /row-level security/i);
  });

  it('les demandes et prêts ne peuvent pas être écrits directement', async () => {
    await expectError(as(CHLOE, `INSERT INTO public.loan_requests (game_copy_id, requester_id, owner_id, requested_return_date, status) VALUES ($1, $2, $3, CURRENT_DATE + 7, 'accepted')`, [aliceCopy, CHLOE, ALICE]), /row-level security/i);
    await expectError(as(ALICE, `INSERT INTO public.loans (game_copy_id, owner_id, borrower_id, expected_return_date) VALUES ($1, $2, $3, CURRENT_DATE + 7)`, [aliceCopy, ALICE, CHLOE]), /row-level security|demande acceptée/i);
    // Le propriétaire ne peut pas déclarer son jeu « prêté » ou « disponible » à la main.
    await expectError(as(ALICE, `UPDATE public.game_copies SET status = 'lent' WHERE id = $1`, [aliceCopy]), /Modification refusée/);
    // Il peut en revanche modifier sa remarque.
    await as(ALICE, `UPDATE public.game_copies SET notes = 'Il manque une tuile bleue' WHERE id = $1`, [aliceCopy]);
  });

  it('parcours complet : demande → refus des autres → prêt → retour → historique', async () => {
    await expectError(as(ALICE, `SELECT public.create_loan_request($1, CURRENT_DATE + 7, 'test')`, [aliceCopy]), /propre jeu/);
    await expectError(as(CHLOE, `SELECT public.create_loan_request($1, CURRENT_DATE - 1, NULL)`, [aliceCopy]), /passé/);

    const r1 = (await as<{ id: string }>(CHLOE, `SELECT (public.create_loan_request($1, CURRENT_DATE + 7, 'Pour samedi')).id`, [aliceCopy]))[0].id;
    await expectError(as(CHLOE, `SELECT public.create_loan_request($1, CURRENT_DATE + 7, NULL)`, [aliceCopy]), /déjà une demande/);
    const r2 = (await as<{ id: string }>(BRUNO, `SELECT (public.create_loan_request($1, CURRENT_DATE + 3, NULL)).id`, [aliceCopy]))[0].id;

    // Une demande en attente ne change pas la disponibilité.
    expect((await as(CHLOE, `SELECT status FROM public.game_copies WHERE id = $1`, [aliceCopy]))[0].status).toBe('available');

    // Seul le propriétaire décide.
    await expectError(as(BRUNO, `SELECT public.accept_loan_request($1)`, [r1]), /introuvable/);
    await expectError(as(CHLOE, `SELECT public.refuse_loan_request($1)`, [r1]), /introuvable/);
    await expectError(as(BRUNO, `SELECT public.cancel_loan_request($1)`, [r1]), /introuvable/);

    const loan = (await as<{ id: string; borrower_id: string; owner_id: string; game_copy_id: string }>(ALICE,
      `SELECT (l).id, (l).borrower_id, (l).owner_id, (l).game_copy_id FROM (SELECT public.accept_loan_request($1) AS l) s`, [r1]))[0];
    expect(loan).toMatchObject({ borrower_id: CHLOE, owner_id: ALICE, game_copy_id: aliceCopy });

    const statuses = await as(ALICE, `SELECT id, status FROM public.loan_requests WHERE game_copy_id = $1`, [aliceCopy]);
    expect(Object.fromEntries(statuses.map((s) => [s.id, s.status]))).toEqual({ [r1]: 'accepted', [r2]: 'refused' });
    expect((await as(BRUNO, `SELECT status FROM public.game_copies WHERE id = $1`, [aliceCopy]))[0].status).toBe('lent');

    // Double emprunt impossible ; l'autre exemplaire (Bruno) reste empruntable.
    await expectError(as(BRUNO, `SELECT public.create_loan_request($1, CURRENT_DATE + 7, NULL)`, [aliceCopy]), /pas disponible/);
    await expectError(as(ALICE, `SELECT public.accept_loan_request($1)`, [r2]), /déjà été traitée/);
    await as(CHLOE, `SELECT public.create_loan_request($1, CURRENT_DATE + 7, NULL)`, [brunoCopy]);

    // Un jeu prêté ne peut être ni retiré ni changé de disponibilité.
    await expectError(as(ALICE, `SELECT public.archive_game_copy($1)`, [aliceCopy]), /prêté/);
    await expectError(as(ALICE, `SELECT public.set_copy_availability($1, true)`, [aliceCopy]), /prêté/);

    // Tout le groupe voit qui détient l'exemplaire ; seuls les concernés voient le détail du prêt.
    expect((await as(BRUNO, `SELECT borrower_id FROM public.group_active_loans() WHERE game_copy_id = $1`, [aliceCopy]))[0].borrower_id).toBe(CHLOE);
    expect(await as(BRUNO, `SELECT id FROM public.loans WHERE id = $1`, [loan.id])).toEqual([]);
    expect(await as(null, `SELECT * FROM public.group_active_loans()`).catch((e) => String(e))).toMatch(/permission denied/);

    // Prolongation puis retour, confirmés par le propriétaire uniquement.
    await expectError(as(CHLOE, `SELECT public.extend_loan($1, CURRENT_DATE + 30)`, [loan.id]), /introuvable/);
    await as(ALICE, `SELECT public.extend_loan($1, CURRENT_DATE + 30)`, [loan.id]);
    await expectError(as(CHLOE, `SELECT public.return_loan($1)`, [loan.id]), /propriétaire/);
    await as(ALICE, `SELECT public.return_loan($1)`, [loan.id]);
    await expectError(as(ALICE, `SELECT public.return_loan($1)`, [loan.id]), /déjà clôturé/);

    const closed = (await as(CHLOE, `SELECT status, actual_return_date, request_id FROM public.loans WHERE id = $1`, [loan.id]))[0];
    expect(closed.status).toBe('returned');
    expect(closed.actual_return_date).not.toBeNull();
    expect(closed.request_id).toBe(r1);
    expect((await as(BRUNO, `SELECT status FROM public.game_copies WHERE id = $1`, [aliceCopy]))[0].status).toBe('available');

    // Retirer l'exemplaire l'archive : l'historique reste consultable.
    await as(ALICE, `SELECT public.archive_game_copy($1)`, [aliceCopy]);
    expect((await as(CHLOE, `SELECT count(*)::int AS n FROM public.loans WHERE game_copy_id = $1`, [aliceCopy]))[0].n).toBe(1);
    await expectError(as(ALICE, `DELETE FROM public.game_copies WHERE id = $1 RETURNING id`, [aliceCopy]).then((rows) => {
      if (rows.length === 0) throw new Error('row-level security: suppression ignorée');
    }), /row-level security/);
    // Le jeu peut être ajouté de nouveau après archivage.
    await as(ALICE, `INSERT INTO public.game_copies (game_id, owner_id) VALUES ('230802', $1)`, [ALICE]);
  });

  it('rendre un jeu indisponible refuse les demandes en attente', async () => {
    const pending = await as(BRUNO, `SELECT id FROM public.loan_requests WHERE game_copy_id = $1 AND status = 'pending'`, [brunoCopy]);
    expect(pending).toHaveLength(1);
    await expectError(as(CHLOE, `SELECT public.set_copy_availability($1, false)`, [brunoCopy]), /introuvable/);
    await as(BRUNO, `SELECT public.set_copy_availability($1, false)`, [brunoCopy]);
    expect((await as(BRUNO, `SELECT status FROM public.loan_requests WHERE id = $1`, [pending[0].id]))[0].status).toBe('refused');
    await as(BRUNO, `SELECT public.set_copy_availability($1, true)`, [brunoCopy]);
  });

  it('un visiteur anonyme ne peut appeler aucune fonction métier', async () => {
    await expectError(as(null, `SELECT public.create_loan_request($1, CURRENT_DATE + 7, NULL)`, [brunoCopy]), /permission denied/);
  });
});

describe('base partiellement migrée', () => {
  it('010 s’applique avec seulement 001, 002 et 003 (sans échanges ni parties)', async () => {
    const partial = new PGlite({ extensions: { uuid_ossp } });
    await partial.exec(AUTH_STUB);
    for (const file of ['001_initial_schema.sql', '002_business_rules.sql', '003_profiles.sql', '010_loan_integrity_and_privacy.sql']) {
      await partial.exec(SUPABASE_GRANTS);
      await partial.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
    }
    await partial.exec(`INSERT INTO auth.users (id) VALUES ('${ALICE}')`);
    await partial.exec(`SELECT set_config('request.jwt.claim.sub', '${ALICE}', false); SET ROLE authenticated;`);
    const copy = (await partial.query<{ id: string }>(`INSERT INTO public.game_copies (game_id, owner_id) VALUES ('azul', $1) RETURNING id`, [ALICE])).rows[0].id;
    await partial.query(`SELECT public.archive_game_copy($1)`, [copy]);
    const row = (await partial.query<{ archived: boolean }>(`SELECT archived_at IS NOT NULL AS archived FROM public.game_copies WHERE id = $1`, [copy])).rows[0];
    expect(row.archived).toBe(true);
    await partial.close();
  });
});
