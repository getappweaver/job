// ---------------------------------------------------------------------------
// plugins/job/drafts/types.ts — job draft entry shapes
// ---------------------------------------------------------------------------

import type { JobDraftInput } from '../types';

export type CreateDraftEntry = {
  sessionId: string;
  kind: 'create';
  input: JobDraftInput;
  originalPrompt: string;
};

export type UpdateJobInput = JobDraftInput & { id: number };

export type UpdateDraftEntry = {
  sessionId: string;
  kind: 'update';
  input: UpdateJobInput;
  originalPrompt: string;
};

export type DeleteDraftEntry = {
  sessionId: string;
  kind: 'delete';
  input: { id: number };
  originalPrompt: string;
};

export type JobDraftEntry =
  | CreateDraftEntry
  | UpdateDraftEntry
  | DeleteDraftEntry;

export type JobDraftRow = JobDraftEntry & {
  id: number;
  createdAt: number;
};
