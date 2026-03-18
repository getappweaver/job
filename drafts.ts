import type { Database } from 'bun:sqlite';

import type { JobDraftInput } from './types';
import { JobDraftInputSchema } from './types';

export type JobDraftEntry = {
  kind: 'create';
  draftInput: JobDraftInput;
  originalPrompt: string;
};

export type JobDraftRow = JobDraftEntry & { id: number };

export function createJobDraftsTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS job_drafts (
      id              INTEGER PRIMARY KEY,
      kind            TEXT NOT NULL,
      input           TEXT NOT NULL,
      original_prompt TEXT NOT NULL DEFAULT '',
      created_at      INTEGER NOT NULL
    )
  `);
}

export function storeDraft(db: Database, entry: JobDraftEntry): number {
  const now = Date.now();

  const info = db.run(
    `INSERT INTO job_drafts (kind, input, original_prompt, created_at)
     VALUES (?, ?, ?, ?)`,
    [entry.kind, JSON.stringify(entry.draftInput), entry.originalPrompt, now],
  );

  return Number(info.lastInsertRowid);
}

export function getDraft(db: Database, id: number): JobDraftRow | null {
  const row = db.prepare('SELECT * FROM job_drafts WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;

  if (!row) {
    return null;
  }

  return rowToDraft(row);
}

export function listDrafts(db: Database): JobDraftRow[] {
  const rows = db.prepare('SELECT * FROM job_drafts ORDER BY id ASC').all() as Record<
    string,
    unknown
  >[];

  return rows.map(rowToDraft);
}

export function deleteDraft(db: Database, id: number): boolean {
  return db.prepare('DELETE FROM job_drafts WHERE id = ?').run(id).changes > 0;
}

export function updateDraftInput(db: Database, id: number, input: JobDraftInput): boolean {
  const info = db
    .prepare('UPDATE job_drafts SET input = ? WHERE id = ?')
    .run(JSON.stringify(input), id);

  return info.changes > 0;
}

function rowToDraft(row: Record<string, unknown>): JobDraftRow {
  const id = Number(row.id);
  const kind = String(row.kind);
  const originalPrompt = String(row.original_prompt);

  if (kind !== 'create') {
    throw new Error(`Unknown job draft kind: ${kind}`);
  }

  const inputRaw = JSON.parse(String(row.input));
  const parsed = JobDraftInputSchema.safeParse(inputRaw);

  if (!parsed.success) {
    throw new Error(`Invalid job draft input: ${parsed.error.message}`);
  }

  const base = parsed.data;

  const input: JobDraftInput =
    base.execution_type === 'cron'
      ? {
          ...base,
          maxRuns: base.maxRuns ?? null,
        }
      : {
          ...base,
          run_at: base.run_at,
        };

  return {
    id,
    kind: 'create',
    draftInput: input,
    originalPrompt,
  };
}
