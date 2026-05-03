// ---------------------------------------------------------------------------
// plugins/job/commands/ai/schemas.ts — Zod tool-call schema (CLI + skills codegen)
// ---------------------------------------------------------------------------

import { z } from 'zod';

import { JobDraftPromptInputSchema } from '../../types';

const JobListCallSchema = z.object({
  type: z.literal('list'),
});

const JobShowCallSchema = z.object({
  type: z.literal('show'),
  input: z.object({
    id: z.number().int().positive(),
  }),
});

const JobContextCallSchema = z.object({
  type: z.literal('context'),
});

const JobCreateCallSchema = z.object({
  type: z.literal('create'),
  input: JobDraftPromptInputSchema,
  original_prompt: z.string(),
});

const JobToolCallSchema = z.discriminatedUnion('type', [
  JobListCallSchema,
  JobShowCallSchema,
  JobContextCallSchema,
  JobCreateCallSchema,
]);

export type JobToolCall = z.infer<typeof JobToolCallSchema>;

export { JobToolCallSchema as ToolCallSchema };

export const skillDescription = 'Job scheduling via local dm-bot CLI tools.';
