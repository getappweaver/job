// ---------------------------------------------------------------------------
// plugins/jobs/types/job.ts — Stored job types (from DB), job runs
//
// CronJob has session_id: string | null (set on first run). One-time has no session.
// ---------------------------------------------------------------------------
import { z } from 'zod';

import {
  AgentBackendNameSchema,
  AgentModeSchema,
  ProviderNameSchema,
  WorkspaceTargetSchema,
} from '@src/db';

export const JobExecutionTypeSchema = z.enum(['cron', 'one-time']);
export const JobRunStatusSchema = z.enum(['running', 'success', 'error']);
export const JobRunTriggerSchema = z.enum(['scheduled', 'manual', 'retry']);
export const JobRunLogLevelSchema = z.enum(['info', 'success', 'error']);

export const JobRunLogEventSchema = z.enum([
  'run_started',
  'session_created',
  'session_reused',
  'tool_started',
  'tool_finished',
  'tool_failed',
  'backend_status',
  'backend_summary',
  'backend_error',
  'agent_finished',
  'agent_failed',
  'dm_sent',
  'dm_failed',
  'push_sent',
  'push_failed',
  'push_skipped',
  'next_run_scheduled',
  'job_disabled',
  'run_interrupted',
  'run_failed',
  'run_finished',
]);

export type JobExecutionType = z.infer<typeof JobExecutionTypeSchema>;
export type JobRunStatus = z.infer<typeof JobRunStatusSchema>;
export type JobRunTrigger = z.infer<typeof JobRunTriggerSchema>;
export type JobRunLogLevel = z.infer<typeof JobRunLogLevelSchema>;
export type JobRunLogEvent = z.infer<typeof JobRunLogEventSchema>;

export const JobBaseSchema = z.object({
  id: z.number(),
  name: z.string(),
  schedule: z.string(),
  schedule_description: z.string(),
  prompt: z.string(),
  enabled: z.number(),
  created_at: z.number(),
  last_run_at: z.number().nullable(),
  next_run_at: z.number().nullable(),
  backend: AgentBackendNameSchema,
  provider: ProviderNameSchema,
  model: z.string(),
  mode: AgentModeSchema,
  workspace_target: WorkspaceTargetSchema,
  budget_sats: z.number().nullable(),
  instructions: z.string().nullable(),
});

export const CronJobSchema = JobBaseSchema.extend({
  execution_type: z.literal('cron'),
  run_at: z.null(),
  max_runs: z.number().nullable(),
  session_id: z.string().nullable(),
});

export const OneTimeJobSchema = JobBaseSchema.extend({
  execution_type: z.literal('one-time'),
  run_at: z.number().nullable(),
  max_runs: z.null(),
});

export const JobSchema = z.discriminatedUnion('execution_type', [
  CronJobSchema,
  OneTimeJobSchema,
]);

export type CronJob = z.infer<typeof CronJobSchema>;
export type OneTimeJob = z.infer<typeof OneTimeJobSchema>;
export type Job = CronJob | OneTimeJob;

/** Minimal shape needed for getNextRunAt; derived from Job so Job is always assignable. */
export type GetNextRunAtJob = Pick<
  Job,
  'execution_type' | 'schedule' | 'run_at' | 'max_runs'
>;

export const JobRunSchema = z.object({
  id: z.number(),
  job_id: z.number(),
  started_at: z.number(),
  finished_at: z.number().nullable(),
  status: JobRunStatusSchema,
  output: z.string().nullable(),
  error: z.string().nullable(),
  budget_used_msats: z.number().nullable(),
  trigger: JobRunTriggerSchema,
  scheduled_for: z.number().nullable(),
  owner_pid: z.number().nullable(),
});

export type JobRun = z.infer<typeof JobRunSchema>;

export const JobRunLogSchema = z.object({
  id: z.number(),
  run_id: z.number(),
  occurred_at: z.number(),
  event: JobRunLogEventSchema,
  level: JobRunLogLevelSchema,
  message: z.string(),
  details: z.record(z.string(), z.unknown()).nullable(),
});

export type JobRunLog = z.infer<typeof JobRunLogSchema>;
