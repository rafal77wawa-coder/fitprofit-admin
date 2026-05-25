import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Wybór sterownika: jeśli ustawiona zmienna DATABASE_URL (produkcja, Render)
// → PostgreSQL. W przeciwnym razie → wbudowany SQLite (dev lokalny).
const USE_PG = !!process.env.DATABASE_URL;

let impl = null;

// pg używa parametrów $1,$2..., a w kodzie zapytania mają znaki "?".
function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => '$' + ++i);
}

async function makePostgres() {
  const { default: pg } = await import('pg');
  const url = process.env.DATABASE_URL;
  const local = url.includes('localhost') || url.includes('127.0.0.1');
  const pool = new pg.Pool({
    connectionString: url,
    ssl: local ? false : { rejectUnauthorized: false },
  });
  return {
    kind: 'postgres',
    async exec(sql) { await pool.query(sql); },
    async get(sql, ...p) { return (await pool.query(toPg(sql), p)).rows[0]; },
    async all(sql, ...p) { return (await pool.query(toPg(sql), p)).rows; },
    async run(sql, ...p) { return { rowCount: (await pool.query(toPg(sql), p)).rowCount }; },
  };
}

async function makeSqlite() {
  const { DatabaseSync } = await import('node:sqlite');
  const file = process.env.DB_PATH || path.join(ROOT, 'data.db');
  const d = new DatabaseSync(file);
  d.exec('PRAGMA journal_mode = WAL');
  d.exec('PRAGMA foreign_keys = ON');
  return {
    kind: 'sqlite',
    async exec(sql) { d.exec(sql); },
    async get(sql, ...p) { return d.prepare(sql).get(...p); },
    async all(sql, ...p) { return d.prepare(sql).all(...p); },
    async run(sql, ...p) { return { rowCount: d.prepare(sql).run(...p).changes }; },
  };
}

// Inicjalizacja: łączy bazę, tworzy tabele, zasiewa dane jeśli baza jest pusta.
export async function initDb() {
  if (impl) return impl;
  impl = USE_PG ? await makePostgres() : await makeSqlite();

  const schemaFile = USE_PG ? 'schema.postgres.sql' : 'schema.sqlite.sql';
  await impl.exec(fs.readFileSync(path.join(ROOT, schemaFile), 'utf8'));

  // Migracje kolumn dodanych po pierwszym wdrożeniu — dla baz utworzonych
  // wcześniej. Na świeżej bazie ALTER zgłosi błąd (kolumna już jest) i go pomijamy.
  for (const sql of [
    "ALTER TABLE rewards ADD COLUMN image_url TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE rewards ADD COLUMN codes TEXT NOT NULL DEFAULT ''",
  ]) {
    try { await impl.exec(sql); } catch (e) { /* kolumna już istnieje */ }
  }

  const row = await impl.get('SELECT COUNT(*) AS c FROM admin_users');
  if (Number(row.c) === 0) {
    await seed(impl);
    console.log('Baza (' + impl.kind + ') zainicjowana i zasiana danymi startowymi.');
  } else {
    console.log('Baza (' + impl.kind + ') gotowa.');
  }
  return impl;
}

// Wspólny interfejs używany przez trasy API (wywoływany po initDb()).
export const db = {
  exec: (...a) => impl.exec(...a),
  get: (...a) => impl.get(...a),
  all: (...a) => impl.all(...a),
  run: (...a) => impl.run(...a),
};

export default db;
