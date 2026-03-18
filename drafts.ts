import type { Database } from 'bun:sqlite';
import { z } from 'zod';

import { assertUnreachable } from '@src/utils';

import type { JobDraftInput } from './types';
import { JobDraftInputSchema } from './types';

export type CreateDraftEntry = {
  kind: 'create';
  input: JobDraftInput;
  originalPrompt: string;
};

export type UpdateJobInput = JobDraftInput & { id: number };

export type UpdateDraftEntry = {
  kind: 'update';
  input: UpdateJobInput;
  originalPrompt: string;
};

export type DeleteDraftEntry = {
  kind: 'delete';
  input: { id: number };
  originalPrompt: string;
};

export type JobDraftEntry =
  | CreateDraftEntry
  | UpdateDraftEntry
  | DeleteDraftEntry;

export type JobDraftRow = JobDraftEntry & { id: number };

const DraftKindSchema = z.enum(['create', 'update', 'delete']);
const DeleteDraftInputSchema = z.object({ id: z.number().int().positive() });

const UpdateJobInputSchema: z.ZodType<UpdateJobInput> = z
  .object({ id: z.number().int().positive() })
  .and(JobDraftInputSchema) as unknown as z.ZodType<UpdateJobInput>;

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
    [entry.kind, JSON.stringify(entry.input), entry.originalPrompt, now],
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
  const rows = db
    .prepare('SELECT * FROM job_drafts ORDER BY id ASC')
    .all() as Record<string, unknown>[];

  return rows.map(rowToDraft);
}

export function deleteDraft(db: Database, id: number): boolean {
  return db.prepare('DELETE FROM job_drafts WHERE id = ?').run(id).changes > 0;
}

export function updateDraftInput(
  db: Database,
  id: number,
  input: JobDraftEntry['input'],
): boolean {
  const info = db
    .prepare('UPDATE job_drafts SET input = ? WHERE id = ?')
    .run(JSON.stringify(input), id);

  return info.changes > 0;
}

function rowToDraft(row: Record<string, unknown>): JobDraftRow {
  const id = Number(row.id);
  const kindRaw = String(row.kind);
  const originalPrompt = String(row.original_prompt);

  const kindParsed = DraftKindSchema.safeParse(kindRaw);

  if (!kindParsed.success) {
    throw new Error(`Unknown job draft kind: ${kindRaw}`);
  }

  const inputRaw = JSON.parse(String(row.input));
  const kind = kindParsed.data;

  if (kind === 'delete') {
    const parsed = DeleteDraftInputSchema.safeParse(inputRaw);

    if (!parsed.success) {
      throw new Error(
        `Invalid job delete draft input: ${parsed.error.message}`,
      );
    }

    return {
      id,
      kind,
      input: parsed.data,
      originalPrompt,
    };
  } else if (kind === 'update') {
    const parsed = UpdateJobInputSchema.safeParse(inputRaw);

    if (!parsed.success) {
      throw new Error(
        `Invalid job update draft input: ${parsed.error.message}`,
      );
    }

    return {
      id,
      kind,
      input: parsed.data,
      originalPrompt,
    };
  } else if (kind === 'create') {
    const parsed = JobDraftInputSchema.safeParse(inputRaw);

    if (!parsed.success) {
      throw new Error(
        `Invalid job create draft input: ${parsed.error.message}`,
      );
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
      kind,
      input,
      originalPrompt,
    };
  } else {
    return assertUnreachable(kind);
  }
}
