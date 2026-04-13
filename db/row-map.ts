// ---------------------------------------------------------------------------
// plugins/job/db/row-map.ts — SQLite row → Job / JobRun
// ---------------------------------------------------------------------------

import type { ProviderName } from '@src/db';
import { ProviderNameSchema } from '@src/db';

import {
  CronJobSchema,
  JobBaseSchema,
  JobRunSchema,
  OneTimeJobSchema,
  type Job,
  type JobRun,
  type JobRunStatus,
} from '../types';

/** DB may contain empty or legacy values; JobBaseSchema requires local|routstr. */
function coerceStoredProvider(raw: unknown): ProviderName {
  const s = String(raw ?? '').trim();
  const parsed = ProviderNameSchema.safeParse(s.length > 0 ? s : undefined);

  return parsed.success ? parsed.data : 'local';
}

export function rowToJob(row: Record<string, unknown>): Job {
  const commonRaw = {
    id: Number(row.id),
    name: String(row.name),
    schedule: String(row.schedule),
    schedule_description: String(row.schedule_description ?? ''),
    prompt: String(row.prompt),
    enabled: Number(row.enabled),
    created_at: Number(row.created_at),
    last_run_at: row.last_run_at != null ? Number(row.last_run_at) : null,
    next_run_at: row.next_run_at != null ? Number(row.next_run_at) : null,
    backend: String(row.backend ?? ''),
    provider: coerceStoredProvider(row.provider),
    model: String(row.model ?? ''),
    mode: String(row.mode ?? ''),
    workspace_target: String(row.workspace_target ?? ''),
    budget_sats: row.budget_sats != null ? Number(row.budget_sats) : null,
    instructions: row.instructions != null ? String(row.instructions) : null,
  };

  const common = JobBaseSchema.parse(commonRaw);

  if (row.execution_type === 'one-time') {
    const oneTime = OneTimeJobSchema.parse({
      ...common,
      execution_type: 'one-time',
      run_at: row.run_at != null ? Number(row.run_at) : null,
      max_runs: null,
    });

    return oneTime;
  }

  const cron = CronJobSchema.parse({
    ...common,
    execution_type: 'cron',
    run_at: null,
    max_runs: row.max_runs != null ? Number(row.max_runs) : null,
    session_id: row.session_id,
  });

  return cron;
}

export function rowToJobRun(row: Record<string, unknown>): JobRun {
  return JobRunSchema.parse({
    id: Number(row.id),
    job_id: Number(row.job_id),
    started_at: Number(row.started_at),
    finished_at: row.finished_at != null ? Number(row.finished_at) : null,
    status: row.status as JobRunStatus,
    output: row.output != null ? String(row.output) : null,
    error: row.error != null ? String(row.error) : null,
    budget_used_msats:
      row.budget_used_msats != null ? Number(row.budget_used_msats) : null,
  });
}
