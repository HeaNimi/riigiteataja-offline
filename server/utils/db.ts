import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

type SqliteDatabase = InstanceType<typeof Database>

const globalState = globalThis as typeof globalThis & {
  __riigiDb?: SqliteDatabase
}

export function dataDir() {
  return process.env.RT_DATA_DIR || '/data'
}

export function getDatabase() {
  if (globalState.__riigiDb) return globalState.__riigiDb
  const filename = join(dataDir(), 'riigiteataja.sqlite')
  mkdirSync(dirname(filename), { recursive: true })
  const db = new Database(filename)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS import_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      archive TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      laws_imported INTEGER NOT NULL DEFAULT 0,
      error TEXT
    );
    CREATE TABLE IF NOT EXISTS laws (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      identifier TEXT NOT NULL,
      adopted_at TEXT,
      amended_at TEXT,
      xml_path TEXT NOT NULL,
      source_url TEXT,
      body TEXT NOT NULL,
      canonical_xml TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      law_id TEXT NOT NULL,
      parent_id TEXT,
      section_type TEXT NOT NULL,
      section_number TEXT,
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      canonical_xml TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (law_id) REFERENCES laws(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      law_id TEXT NOT NULL,
      section_id TEXT NOT NULL,
      article_number TEXT,
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      canonical_xml TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (law_id) REFERENCES laws(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS sections_law_id ON sections(law_id, sort_order);
    CREATE INDEX IF NOT EXISTS articles_section_id ON articles(section_id, sort_order);
    CREATE VIRTUAL TABLE IF NOT EXISTS laws_fts USING fts5(
      title, identifier, body, tokenize = 'unicode61 remove_diacritics 2'
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS sections_fts USING fts5(
      section_id UNINDEXED, law_id UNINDEXED, title, section_number, body,
      tokenize = 'unicode61 remove_diacritics 2'
    );
  `)
  const columns = db.prepare('PRAGMA table_info(laws)').all() as Array<{ name: string }>
  if (!columns.some(column => column.name === 'canonical_xml')) {
    db.exec("ALTER TABLE laws ADD COLUMN canonical_xml TEXT NOT NULL DEFAULT ''")
  }
  globalState.__riigiDb = db
  rebuildSearchIndex(db)
  return db
}

export function rebuildSearchIndex(db = getDatabase()) {
  db.exec(`
    DELETE FROM laws_fts;
    INSERT INTO laws_fts(rowid, title, identifier, body)
      SELECT rowid, title, identifier, body FROM laws;
    DELETE FROM sections_fts;
    INSERT INTO sections_fts(rowid, section_id, law_id, title, section_number, body)
      SELECT rowid, id, law_id, title, section_number, body FROM sections;
  `)
}

export function latestImport() {
  return getDatabase().prepare(`
    SELECT id, archive, imported_at AS importedAt, laws_imported AS lawsImported, error
    FROM import_runs ORDER BY id DESC LIMIT 1
  `).get() || null
}

export function archiveStatus() {
  const db = getDatabase()
  const count = (table: 'laws' | 'sections' | 'articles') =>
    (db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count
  const digest = db.prepare('SELECT value FROM app_meta WHERE key = ?').get('archiveSha256') as { value?: string } | undefined
  return {
    dataDir: dataDir(),
    archiveYear: process.env.RT_ARCHIVE_YEAR || null,
    autoDownload: process.env.RT_AUTO_DOWNLOAD?.toLowerCase() === 'true',
    archiveUrl: process.env.RT_ARCHIVE_URL || null,
    archiveSha256: digest?.value || null,
    laws: count('laws'),
    sections: count('sections'),
    articles: count('articles'),
    latestImport: latestImport()
  }
}
