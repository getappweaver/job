// ---------------------------------------------------------------------------
// plugins/job/db/open.ts — open plugin SQLite (single source for CLI + plugin)
// ---------------------------------------------------------------------------

import { join } from 'path';

import { Database } from 'bun:sqlite';

import { createJobDraftsTable } from '../drafts';

import { createJobTables } from './tables';

export function openDb(): Database {
  const db = new Database(join(import.meta.dir, '..', 'db.sqlite'), {
    strict: true,
  });

  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode=WAL');
  createJobTables(db);
  createJobDraftsTable(db);

  return db;
}
