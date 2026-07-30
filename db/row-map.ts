// ---------------------------------------------------------------------------
// plugins/job/db/row-map.ts — SQLite row → typed job records
// ---------------------------------------------------------------------------

import type { ProviderName, WorkspaceTarget } from '@src/db';
import { ProviderNameSchema, WorkspaceTargetSchema } from '@src/db';

import {
  CronJobSchema,
  JobBaseSchema,
  JobRunLogSchema,
  JobRunSchema,
  OneTimeJobSchema,
  type Job,
  type JobRun,
  type JobRunLog,
  type JobRunLogEvent,
  type JobRunLogLevel,
  type JobRunStatus,
  type JobRunTrigger,
} from '../types';

/** DB may contain empty or legacy values; JobBaseSchema requires local|routstr. */
function coerceStoredProvider(raw: unknown): ProviderName {
  const s = String(raw ?? '').trim();
  const parsed = ProviderNameSchema.safeParse(s.length > 0 ? s : undefined);

  return parsed.success ? parsed.data : 'local';
}

/** DB may contain empty or legacy values; JobBaseSchema requires parent|appweaver. */
function coerceStoredWorkspaceTarget(raw: unknown): WorkspaceTarget {
  const s = String(raw ?? '').trim();
  const parsed = WorkspaceTargetSchema.safeParse(s.length > 0 ? s : undefined);

  return parsed.success ? parsed.data : 'parent';
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
    workspace_target: coerceStoredWorkspaceTarget(row.workspace_target),
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
    trigger: row.trigger_source as JobRunTrigger,
    scheduled_for: row.scheduled_for != null ? Number(row.scheduled_for) : null,
    owner_pid: row.owner_pid != null ? Number(row.owner_pid) : null,
  });
}

export function rowToJobRunLog(row: Record<string, unknown>): JobRunLog {
  let details: Record<string, unknown> | null = null;

  if (typeof row.details_json === 'string') {
    try {
      const parsed = JSON.parse(row.details_json) as unknown;

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        details = parsed as Record<string, unknown>;
      }
    } catch {
      details = { invalid_json: row.details_json };
    }
  }

  return JobRunLogSchema.parse({
    id: Number(row.id),
    run_id: Number(row.run_id),
    occurred_at: Number(row.occurred_at),
    event: row.event as JobRunLogEvent,
    level: row.level as JobRunLogLevel,
    message: String(row.message),
    details,
  });
}
