// ---------------------------------------------------------------------------
// plugins/job/db/runs.ts — job_runs CRUD
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { JobRun, JobRunStatus } from '../types';

import { rowToJobRun } from './row-map';

export function listJobRuns(
  db: Database,
  jobId: number,
  limit: number,
): JobRun[] {
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
    .run({ jobId, startedAt: now, status: 'running' });

  return Number(info.lastInsertRowid);
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
    'UPDATE job_runs SET finished_at = $finishedAt, status = $status, output = $output, error = $error, budget_used_msats = $budgetUsedMsats WHERE id = $id',
  ).run({
    finishedAt: now,
    status,
    output,
    error,
    budgetUsedMsats,
    id: runId,
  });
}
