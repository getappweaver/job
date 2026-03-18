// ---------------------------------------------------------------------------
// plugins/jobs/types/draft.ts — Draft input for job creation (!jobs ai, confirm)
//
// No session_id. Used for draft payloads and as the input to createJob() on confirm.
// ---------------------------------------------------------------------------
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Prompt-only schema (what the model must output)
//
// Intentionally omits: backend/provider/model/mode/workspace_target.
// These are injected from ctx.defaults after generation.
// ---------------------------------------------------------------------------

const JobDraftBaseSchema = z.object({
  name: z.string().min(1),
  prompt: z.string().min(1),
  schedule_description: z.string().min(1),
  backend: z.string(),
  provider: z.string(),
  model: z.string(),
  mode: z.string(),
  workspace_target: z.string(),
  budget_sats: z.number().int().positive().nullable(),
  instructions: z.string().nullable(),
});

export const CronJobDraftInputSchema = JobDraftBaseSchema.extend({
  execution_type: z.literal('cron'),
  schedule: z.string().min(1),
  maxRuns: z.number().int().positive().nullable(),
});

export const OneTimeJobDraftInputSchema = JobDraftBaseSchema.extend({
  execution_type: z.literal('one-time'),
  run_at: z.string().min(1).describe('ISO 8601 datetime string in UTC e.g. 2025-12-01T09:00:00Z'),
});

export const JobDraftInputSchema = z.discriminatedUnion('execution_type', [
  CronJobDraftInputSchema,
  OneTimeJobDraftInputSchema,
]);

export const CronJobDraftPromptInputSchema = CronJobDraftInputSchema.pick({
  execution_type: true,
  name: true,
  prompt: true,
  schedule_description: true,
  schedule: true,
  maxRuns: true,
  budget_sats: true,
  instructions: true,
});

export const OneTimeJobDraftPromptInputSchema = OneTimeJobDraftInputSchema.pick({
  execution_type: true,
  name: true,
  prompt: true,
  schedule_description: true,
  run_at: true,
  budget_sats: true,
  instructions: true,
});

export const JobDraftPromptInputSchema = z.discriminatedUnion('execution_type', [
  CronJobDraftPromptInputSchema,
  OneTimeJobDraftPromptInputSchema,
]);

export type JobDraftPromptInput = z.infer<typeof JobDraftPromptInputSchema>;

export type JobInput = z.infer<typeof JobDraftBaseSchema>;
export type CronJobDraftInput = JobInput & z.infer<typeof CronJobDraftInputSchema>;
export type OneTimeJobDraftInput = JobInput & z.infer<typeof OneTimeJobDraftInputSchema>;
export type JobDraftInput = CronJobDraftInput | OneTimeJobDraftInput;
