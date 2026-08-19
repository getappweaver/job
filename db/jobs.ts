// ---------------------------------------------------------------------------
// plugins/job/db/jobs.ts — jobs table CRUD + scheduling fields
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { Job, JobDraftInput } from '../types';

import { getNextRunAt, validateSchedule } from './cron-schedule';
import { rowToJob } from './row-map';

type UpdateJobDetailsProps = {
  db: Database;
  id: number;
  name: string;
  model: string;
  prompt: string;
  instructions: string | null;
};

export function getJobRunCount(db: Database, jobId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) as c FROM job_runs WHERE job_id = $jobId')
    .get({ jobId }) as { c: number };

  return Number(row?.c ?? 0);
}

export function createJob(db: Database, input: JobDraftInput): Job {
  const now = Date.now();

  if (input.execution_type === 'cron') {
    const validated = validateSchedule(input.schedule);

    if (validated.ok === false) {
      throw new Error(validated.error);
    }

    const next_run_at = getNextRunAt(
      {
        execution_type: 'cron',
        schedule: validated.cron,
        run_at: null,
        max_runs: input.maxRuns,
      },
      undefined,
      0,
    );

    if (next_run_at == null) {
      throw new Error('Could not compute next run time');
    }

    const info = db
      .query(
        `INSERT INTO jobs (
           name, schedule, schedule_description, prompt,
           enabled, created_at, last_run_at, next_run_at,
           backend, provider, model, mode, workspace_target,
           session_id, budget_sats, instructions,
           execution_type, run_at, max_runs
         )
         VALUES (
           $name, $schedule, $scheduleDescription, $prompt,
           1, $createdAt, NULL, $nextRunAt,
           $backend, $provider, $model, $mode, $workspaceTarget,
           NULL, $budgetSats, $instructions,
           'cron', NULL, $maxRuns
         )`,
      )
      .run({
        name: input.name,
        schedule: validated.cron,
        scheduleDescription: input.schedule_description,
        prompt: input.prompt,
        createdAt: now,
        nextRunAt: next_run_at,
        backend: input.backend,
        provider: input.provider,
        model: input.model,
        mode: input.mode,
        workspaceTarget: input.workspace_target,
        budgetSats: input.budget_sats,
        instructions: input.instructions,
        maxRuns: input.maxRuns,
      });

    return getJob(db, Number(info.lastInsertRowid))!;
  }

  const runAtMs = new Date(input.run_at).getTime();

  if (runAtMs <= now) {
    throw new Error('run_at must be in the future');
  }

  const info = db
    .query(
      `INSERT INTO jobs (
           name, schedule, schedule_description, prompt,
           enabled, created_at, last_run_at, next_run_at,
           backend, provider, model, mode, workspace_target,
           session_id, budget_sats, instructions,
           execution_type, run_at, max_runs
         )
         VALUES (
           $name, $schedule, $scheduleDescription, $prompt,
           1, $createdAt, NULL, $nextRunAt,
           $backend, $provider, $model, $mode, $workspaceTarget,
           NULL, $budgetSats, $instructions,
           'one-time', $runAt, NULL
         )`,
    )
    .run({
      name: input.name,
      schedule: 'once',
      scheduleDescription: input.schedule_description,
      prompt: input.prompt,
      createdAt: now,
      nextRunAt: runAtMs,
      backend: input.backend,
      provider: input.provider,
      model: input.model,
      mode: input.mode,
      workspaceTarget: input.workspace_target,
      budgetSats: input.budget_sats,
      instructions: input.instructions,
      runAt: runAtMs,
    });

  return getJob(db, Number(info.lastInsertRowid))!;
}

export function listJobs(db: Database): Job[] {
  const rows = db
    .prepare(
      'SELECT * FROM jobs ORDER BY enabled DESC, next_run_at ASC NULLS LAST, id ASC',
    )
    .all() as Record<string, unknown>[];

  return rows.map(rowToJob);
}

export function getJob(db: Database, id: number): Job | null {
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as
    Record<string, unknown> | undefined;

  return row ? rowToJob(row) : null;
}

export function updateJobDetails({
  db,
  id,
  name,
  model,
  prompt,
  instructions,
}: UpdateJobDetailsProps): Job | null {
  const info = db
    .prepare(
      `UPDATE jobs
       SET name = $name, model = $model, prompt = $prompt, instructions = $instructions
       WHERE id = $id`,
    )
    .run({ id, name, model, prompt, instructions });

  return info.changes > 0 ? getJob(db, id) : null;
}

export function deleteJob(db: Database, id: number): boolean {
  const info = db.prepare('DELETE FROM jobs WHERE id = ?').run(id);

  return info.changes > 0;
}

export function updateJobSessionId(
  db: Database,
  id: number,
  sessionId: string,
): void {
  db.prepare('UPDATE jobs SET session_id = ? WHERE id = ?').run(sessionId, id);
}

export function enableJob(db: Database, id: number): boolean {
  const job = getJob(db, id);

  if (!job || job.enabled) {
    return false;
  }

  const runCount = getJobRunCount(db, id);
  const next_run_at = getNextRunAt(job, undefined, runCount);

  if (next_run_at == null) {
    return false;
  }

  db.prepare('UPDATE jobs SET enabled = 1, next_run_at = ? WHERE id = ?').run(
    next_run_at,
    id,
  );

  return true;
}

export function disableJob(db: Database, id: number): boolean {
  const info = db
    .prepare('UPDATE jobs SET enabled = 0, next_run_at = NULL WHERE id = ?')
    .run(id);

  return info.changes > 0;
}

/**
 * List jobs that are enabled and due (next_run_at <= now).
 */
export function listDueJobs(db: Database): Job[] {
  const now = Date.now();

  const rows = db
    .query(
      'SELECT * FROM jobs WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= $now',
    )
    .all({ now }) as Record<string, unknown>[];

  return rows.map(rowToJob);
}

export function updateJobRunTimes(
  db: Database,
  jobId: number,
  lastRunAt: number,
  nextRunAt: number | null,
): void {
  db.prepare(
    'UPDATE jobs SET last_run_at = ?, next_run_at = ? WHERE id = ?',
  ).run(lastRunAt, nextRunAt, jobId);
}
