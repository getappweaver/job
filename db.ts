import type { Database } from 'bun:sqlite';
import { Cron } from 'croner';

import {
  CronJobSchema,
  JobBaseSchema,
  JobRunSchema,
  OneTimeJobSchema,
  type JobDraftInput,
  type GetNextRunAtJob,
  type Job,
  type JobRun,
  type JobRunStatus,
} from './types';

export function createJobTables(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id                 INTEGER PRIMARY KEY,
      name               TEXT    NOT NULL,
      schedule           TEXT    NOT NULL,
      schedule_description TEXT  NOT NULL,
      prompt             TEXT    NOT NULL,
      enabled            INTEGER NOT NULL DEFAULT 1,
      created_at         INTEGER NOT NULL,
      last_run_at        INTEGER,
      next_run_at        INTEGER,
      backend            TEXT    NOT NULL,
      provider           TEXT    NOT NULL,
      model              TEXT    NOT NULL,
      mode               TEXT    NOT NULL,
      workspace_target   TEXT    NOT NULL,
      session_id         TEXT,
      budget_sats        INTEGER,
      instructions       TEXT,
      execution_type     TEXT    NOT NULL,
      run_at             INTEGER,
      max_runs           INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS job_runs (
      id                INTEGER PRIMARY KEY,
      job_id            INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      started_at        INTEGER NOT NULL,
      finished_at       INTEGER,
      status            TEXT    NOT NULL,
      output            TEXT,
      error             TEXT,
      budget_used_msats INTEGER
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_jobs_next_run_at ON jobs(next_run_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_job_runs_job_id ON job_runs(job_id)');
}

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

function rowToJob(row: Record<string, unknown>): Job {
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
    provider: String(row.provider ?? ''),
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

function rowToJobRun(row: Record<string, unknown>): JobRun {
  return JobRunSchema.parse({
    id: Number(row.id),
    job_id: Number(row.job_id),
    started_at: Number(row.started_at),
    finished_at: row.finished_at != null ? Number(row.finished_at) : null,
    status: row.status as JobRunStatus,
    output: row.output != null ? String(row.output) : null,
    error: row.error != null ? String(row.error) : null,
    budget_used_msats: row.budget_used_msats != null ? Number(row.budget_used_msats) : null,
  });
}

export function getJobRunCount(db: Database, jobId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) as c FROM job_runs WHERE job_id = $jobId')
    .get({ $jobId: jobId }) as { c: number };

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

    const info = db.run(
      `INSERT INTO jobs (name, schedule, schedule_description, prompt, enabled, created_at,last_run_at, next_run_at, backend, provider, model, mode, workspace_target, session_id, budget_sats, instructions, execution_type, run_at, max_runs)
       VALUES ($name, $schedule, $scheduleDescription, $prompt, 1, $createdAt, 
       NULL, $nextRunAt, $backend, $provider, $model, $mode, $workspaceTarget, 
       NULL, $budgetSats, $instructions, 'cron', NULL, $maxRuns)`,
      [
        {
          $name: input.name,
          $schedule: validated.cron,
          $scheduleDescription: input.schedule_description,
          $prompt: input.prompt,
          $createdAt: now,
          $nextRunAt: next_run_at,
          $backend: input.backend,
          $provider: input.provider,
          $model: input.model,
          $mode: input.mode,
          $workspaceTarget: input.workspace_target,
          $budgetSats: input.budget_sats,
          $instructions: input.instructions,
          $maxRuns: input.maxRuns,
        },
      ],
    );

    return getJob(db, Number(info.lastInsertRowid))!;
  } else {
    const runAtMs = new Date(input.run_at).getTime();

    if (runAtMs <= now) {
      throw new Error('run_at must be in the future');
    }

    const info = db.run(
      `INSERT INTO jobs (name, schedule, schedule_description, prompt, enabled, created_at, last_run_at, next_run_at, backend, provider, model, mode, workspace_target, session_id, budget_sats, instructions, execution_type, run_at, max_runs)
       VALUES ($name, $schedule, $scheduleDescription, $prompt, 1, $createdAt, NULL, $nextRunAt, $backend, $provider, $model, $mode, $workspaceTarget, NULL, $budgetSats, $instructions, 'one-time', $runAt, NULL)`,
      [
        {
          $name: input.name,
          $schedule: 'once',
          $scheduleDescription: input.schedule_description,
          $prompt: input.prompt,
          $createdAt: now,
          $nextRunAt: runAtMs,
          $backend: input.backend,
          $provider: input.provider,
          $model: input.model,
          $mode: input.mode,
          $workspaceTarget: input.workspace_target,
          $budgetSats: input.budget_sats,
          $instructions: input.instructions,
          $runAt: runAtMs,
        },
      ],
    );

    return getJob(db, Number(info.lastInsertRowid))!;
  }
}

export function listJobs(db: Database): Job[] {
  const rows = db.prepare('SELECT * FROM jobs ORDER BY next_run_at ASC').all() as Record<
    string,
    unknown
  >[];

  return rows.map(rowToJob);
}

export function getJob(db: Database, id: number): Job | null {
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;

  return row ? rowToJob(row) : null;
}

export function deleteJob(db: Database, id: number): boolean {
  const info = db.prepare('DELETE FROM jobs WHERE id = ?').run(id);

  return info.changes > 0;
}

export function updateJobSessionId(db: Database, id: number, sessionId: string): void {
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

  db.prepare('UPDATE jobs SET enabled = 1, next_run_at = ? WHERE id = ?').run(next_run_at, id);

  return true;
}

export function disableJob(db: Database, id: number): boolean {
  const info = db.prepare('UPDATE jobs SET enabled = 0, next_run_at = NULL WHERE id = ?').run(id);

  return info.changes > 0;
}

/**
 * List jobs that are enabled and due (next_run_at <= now).
 */
export function listDueJobs(db: Database): Job[] {
  const now = Date.now();

  const rows = db
    .prepare(
      'SELECT * FROM jobs WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= $now',
    )
    .all(now) as Record<string, unknown>[];

  return rows.map(rowToJob);
}

export function updateJobRunTimes(
  db: Database,
  jobId: number,
  lastRunAt: number,
  nextRunAt: number | null,
): void {
  db.prepare('UPDATE jobs SET last_run_at = ?, next_run_at = ? WHERE id = ?').run(
    lastRunAt,
    nextRunAt,
    jobId,
  );
}

export function listJobRuns(db: Database, jobId: number, limit: number): JobRun[] {
  const rows = db
    .prepare('SELECT * FROM job_runs WHERE job_id = ? ORDER BY id DESC LIMIT ?')
    .all(jobId, limit) as Record<string, unknown>[];

  return rows.map(rowToJobRun);
}

export function insertJobRun(db: Database, jobId: number): number {
  const now = Date.now();

  const info = db
    .prepare(
      'INSERT INTO job_runs (job_id, started_at, finished_at, status, output, error) VALUES ($jobId, $startedAt, NULL, $status, NULL, NULL)',
    )
    .run({ $jobId: jobId, $startedAt: now, $status: 'running' });

  return info.lastInsertRowid as number;
}

export function updateJobRun(
  db: Database,
  runId: number,
  status: JobRunStatus,
  output: string | null,
  error: string | null,
  budgetUsedMsats: number | null,
): void {
  const now = Date.now();

  db.prepare(
    'UPDATE job_runs SET finished_at = $finishedAt, status = $status, output = $output, error = $error, budget_used_msats = $budgetUsedMsats WHERE id = $runId',
  ).run({
    $finishedAt: now,
    $status: status,
    $output: output ?? null,
    $error: error ?? null,
    $budgetUsedMsats: budgetUsedMsats,
    $runId: runId,
  });
}
