// ---------------------------------------------------------------------------
// plugins/job/db/runs.ts — job_runs CRUD and execution metadata
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { JobRun, JobRunStatus, JobRunTrigger } from '../types';

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

type InsertJobRunProps = {
  db: Database;
  jobId: number;
  startedAt: number;
  trigger: JobRunTrigger;
  scheduledFor: number | null;
  ownerPid: number;
};

export function insertJobRun({
  db,
  jobId,
  startedAt,
  trigger,
  scheduledFor,
  ownerPid,
}: InsertJobRunProps): number | null {
  const insert = db.prepare(
    `INSERT INTO job_runs (
       job_id, started_at, finished_at, status, output, error,
       trigger_source, scheduled_for, owner_pid
     )
     SELECT
       $jobId, $startedAt, NULL, $status, NULL, NULL,
       $trigger, $scheduledFor, $ownerPid
     FROM jobs j
     WHERE j.id = $jobId
       AND (
         $trigger != 'scheduled'
         OR (j.enabled = 1 AND j.next_run_at = $scheduledFor)
       )
       AND NOT EXISTS (
       SELECT 1
       FROM job_runs
       WHERE job_id = $jobId AND status = 'running'
     )`,
  );

  try {
    const info = insert.run({
      jobId,
      startedAt,
      status: 'running',
      trigger,
      scheduledFor,
      ownerPid,
    });

    return info.changes === 0 ? null : Number(info.lastInsertRowid);
  } catch (err) {
    if (/UNIQUE constraint failed: job_runs\.job_id/.test(String(err))) {
      return null;
    }

    throw err;
  }
}

type UpdateJobRunProps = {
  db: Database;
  runId: number;
  status: JobRunStatus;
  output: string | null;
  error: string | null;
  budgetUsedMsats: number | null;
  finishedAt: number;
};

export function updateJobRun({
  db,
  runId,
  status,
  output,
  error,
  budgetUsedMsats,
  finishedAt,
}: UpdateJobRunProps): void {
  db.prepare(
    'UPDATE job_runs SET finished_at = $finishedAt, status = $status, output = $output, error = $error, budget_used_msats = $budgetUsedMsats WHERE id = $id',
  ).run({
    finishedAt,
    status,
    output,
    error,
    budgetUsedMsats,
    id: runId,
  });
}
