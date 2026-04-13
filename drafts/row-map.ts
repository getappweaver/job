// ---------------------------------------------------------------------------
// plugins/job/drafts/row-map.ts — SQLite row → JobDraftRow
// ---------------------------------------------------------------------------

import { assertUnreachable } from '@src/utils';

import { JobDraftInputSchema } from '../types';

import {
  DeleteDraftInputSchema,
  DraftKindSchema,
  UpdateJobInputSchema,
} from './schemas';
import type { JobDraftRow } from './types';

export function rowToDraft(row: Record<string, unknown>): JobDraftRow {
  const id = Number(row.id);
  const sessionId = String(row.session_id ?? '');
  const createdAt = Number(row.created_at);
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
      sessionId,
      createdAt,
      kind,
      input: parsed.data,
      originalPrompt,
    };
  }

  if (kind === 'update') {
    const parsed = UpdateJobInputSchema.safeParse(inputRaw);

    if (!parsed.success) {
      throw new Error(
        `Invalid job update draft input: ${parsed.error.message}`,
      );
    }

    return {
      id,
      sessionId,
      createdAt,
      kind,
      input: parsed.data,
      originalPrompt,
    };
  }

  if (kind === 'create') {
    const parsed = JobDraftInputSchema.safeParse(inputRaw);

    if (!parsed.success) {
      throw new Error(
        `Invalid job create draft input: ${parsed.error.message}`,
      );
    }

    const base = parsed.data;

    const input =
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
      sessionId,
      createdAt,
      kind,
      input,
      originalPrompt,
    };
  }

  return assertUnreachable(kind);
}
