// ---------------------------------------------------------------------------
// plugins/job/drafts/schemas.ts — Zod validators for persisted draft JSON
// ---------------------------------------------------------------------------

import { z } from 'zod';

import { JobDraftInputSchema } from '../types';

import type { UpdateJobInput } from './types';

export const DraftKindSchema = z.enum(['create', 'update', 'delete']);

export const DeleteDraftInputSchema = z.object({
  id: z.number().int().positive(),
});

export const UpdateJobInputSchema: z.ZodType<UpdateJobInput> = z
  .object({ id: z.number().int().positive() })
  .and(JobDraftInputSchema) as unknown as z.ZodType<UpdateJobInput>;
