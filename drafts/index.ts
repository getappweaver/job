// ---------------------------------------------------------------------------
// plugins/job/drafts/index.ts — public drafts API (split modules in this folder)
// ---------------------------------------------------------------------------

export type {
  CreateDraftEntry,
  DeleteDraftEntry,
  JobDraftEntry,
  JobDraftRow,
  UpdateDraftEntry,
  UpdateJobInput,
} from './types';

export { createJobDraftsTable } from './tables';
export {
  createDraftSessionId,
  deleteDraft,
  getDraft,
  getDraftBySessionIndex,
  listDrafts,
  listDraftsBySession,
  storeDraft,
  updateDraftEntry,
  updateDraftInput,
} from './storage';
