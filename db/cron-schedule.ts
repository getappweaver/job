// ---------------------------------------------------------------------------
// plugins/job/db/cron-schedule.ts — next run + cron validation (croner)
// ---------------------------------------------------------------------------

import { Cron } from 'croner';

import type { GetNextRunAtJob } from '../types';

export function getNextRunAt(
  job: GetNextRunAtJob,
  afterTimeMs?: number,
  runCount?: number,
): number | null {
  if (job.execution_type === 'one-time' && job.run_at != null) {
    try {
      const cron = new Cron(new Date(job.run_at), { paused: true });
      const from = afterTimeMs != null ? new Date(afterTimeMs) : undefined;
      const next = cron.nextRun(from);

      return next ? next.getTime() : null;
    } catch {
      return null;
    }
  }

  if (job.execution_type === 'cron' && job.schedule) {
    if (job.max_runs != null && (runCount ?? 0) >= job.max_runs) {
      return null;
    }

    try {
      const cron = new Cron(job.schedule, { paused: true });
      const from = afterTimeMs != null ? new Date(afterTimeMs) : undefined;
      const next = cron.nextRun(from);

      return next ? next.getTime() : null;
    } catch {
      return null;
    }
  }

  return null;
}

export function validateSchedule(
  schedule: string,
): { ok: true; cron: string } | { ok: false; error: string } {
  try {
    const cron = new Cron(schedule, { paused: true });
    const next = cron.nextRun();

    if (next == null) {
      return { ok: false, error: `Invalid cron expression: ${schedule}` };
    }

    return { ok: true, cron: schedule };
  } catch {
    return { ok: false, error: `Invalid cron expression: ${schedule}` };
  }
}
