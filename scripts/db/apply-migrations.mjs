// Applique automatiquement les migrations Supabase qui ne l'ont pas encore été.
//
// Lancé par GitHub Actions à chaque mise en ligne (voir .github/workflows/database.yml),
// avec l'adresse de connexion à la base stockée dans le secret GitHub SUPABASE_DB_URL.
// Le secret n'est jamais affiché ni écrit dans le dépôt.
//
// - Les migrations déjà appliquées sont notées dans ludotheque_admin.applied_migrations
//   (schéma non exposé à l'API publique de Supabase).
// - Chaque migration s'exécute dans une transaction : en cas d'erreur, rien n'est modifié
//   et les suivantes ne sont pas lancées.
// - Premier passage : les migrations 001 à 011, appliquées à la main auparavant, sont
//   simplement notées comme faites (elles ne sont pas rejouées).
// - ADMIN_EMAILS (facultatif, secret GitHub) : adresses séparées par des virgules dont le
//   compte reçoit le rôle administrateur.
//
// Usage : node scripts/db/apply-migrations.mjs            (applique)
//         node scripts/db/apply-migrations.mjs --script supabase/nettoyage/x.sql  (script ponctuel)

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import pg from 'pg';

const ROOT = resolve(import.meta.dirname, '..', '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const SCRIPTS_DIR = join(ROOT, 'supabase', 'nettoyage');
const BASELINE_LAST = '011';

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.log('SUPABASE_DB_URL absent : application automatique des migrations désactivée.');
  process.exit(0);
}

const scriptArg = process.argv.indexOf('--script');
const oneOff = scriptArg > -1 ? process.argv[scriptArg + 1] : null;

const isLocal = ['localhost', '127.0.0.1', ''].includes(new URL(url).hostname);
const client = new pg.Client({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } });

const run = async () => {
  await client.connect();
  console.log('Connecté à la base.');

  if (oneOff) {
    const file = resolve(ROOT, oneOff);
    if (relative(SCRIPTS_DIR, file).startsWith('..') || !file.endsWith('.sql') || !existsSync(file)) {
      throw new Error(`Script refusé : seuls les fichiers .sql de supabase/nettoyage/ peuvent être lancés (${oneOff}).`);
    }
    console.log(`Script ponctuel : ${relative(ROOT, file)}`);
    const results = await client.query(readFileSync(file, 'utf8'));
    const last = [].concat(results).filter((r) => r.rows?.length).at(-1);
    if (last) console.table(last.rows);
    return;
  }

  await client.query(`
    CREATE SCHEMA IF NOT EXISTS ludotheque_admin;
    REVOKE ALL ON SCHEMA ludotheque_admin FROM PUBLIC;
    CREATE TABLE IF NOT EXISTS ludotheque_admin.applied_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      baseline BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

  const files = readdirSync(MIGRATIONS_DIR).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();
  const { rows } = await client.query('SELECT name FROM ludotheque_admin.applied_migrations');
  const done = new Set(rows.map((r) => r.name));

  if (done.size === 0) {
    const baseline = files.filter((f) => f.slice(0, 3) <= BASELINE_LAST);
    for (const name of baseline) {
      await client.query('INSERT INTO ludotheque_admin.applied_migrations (name, baseline) VALUES ($1, TRUE)', [name]);
      done.add(name);
    }
    console.log(`Premier passage : ${baseline.length} migrations déjà appliquées à la main notées comme faites.`);
  }

  const pending = files.filter((f) => !done.has(f));
  if (pending.length === 0) console.log('Base à jour : aucune migration à appliquer.');
  for (const name of pending) {
    console.log(`Application de ${name}…`);
    try {
      await client.query('BEGIN');
      await client.query(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'));
      await client.query('INSERT INTO ludotheque_admin.applied_migrations (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      console.log(`  ✓ ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Échec de ${name} (aucune modification enregistrée) : ${error.message}`);
    }
  }

  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (admins.length) {
    const result = await client.query(
      `UPDATE public.profiles SET role = 'admin', updated_at = NOW()
       WHERE role IS DISTINCT FROM 'admin'
         AND id IN (SELECT id FROM auth.users WHERE LOWER(email) = ANY($1::text[]))`,
      [admins],
    );
    console.log(result.rowCount ? `${result.rowCount} compte(s) passé(s) administrateur.` : 'Administrateurs déjà en place.');
  }
};

run()
  .then(() => client.end())
  .catch(async (error) => {
    console.error(error.message);
    await client.end().catch(() => {});
    process.exit(1);
  });
