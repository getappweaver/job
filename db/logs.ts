import type { Database } from 'bun:sqlite';

import type { JobRunLog, JobRunLogEvent, JobRunLogLevel } from '../types';

import { getNextRunAt } from './cron-schedule';
import { getJob, getJobRunCount, updateJobRunTimes } from './jobs';
import { rowToJobRunLog } from './row-map';

type AppendJobRunLogProps = {
  db: Database;
  runId: number;
  event: JobRunLogEvent;
  level: JobRunLogLevel;
  message: string;
  details: Record<string, unknown> | null;
  occurredAt: number;
};

export function appendJobRunLog({
  db,
  runId,
  event,
  level,
  message,
  details,
  occurredAt,
}: AppendJobRunLogProps): JobRunLog {
  const info = db
    .prepare(
      `INSERT INTO job_run_logs (
         run_id, occurred_at, event, level, message, details_json
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      runId,
      occurredAt,
      event,
      level,
      message,
      details === null ? null : JSON.stringify(details),
    );

  const row = db
    .prepare('SELECT * FROM job_run_logs WHERE id = ?')
    .get(Number(info.lastInsertRowid)) as Record<string, unknown>;

  return rowToJobRunLog(row);
}

type ListJobLogsProps = {
  db: Database;
  jobId: number;
  runId: number | null;
  afterId: number | null;
  limit: number | null;
};

export function listJobLogs({
  db,
  jobId,
  runId,
  afterId,
  limit,
}: ListJobLogsProps): JobRunLog[] {
  const rows = db
    .prepare(
      `SELECT l.*
       FROM job_run_logs l
       JOIN job_runs r ON r.id = l.run_id
       WHERE r.job_id = $jobId
         AND ($runId IS NULL OR l.run_id = $runId)
         AND ($afterId IS NULL OR l.id > $afterId)
       ORDER BY l.occurred_at ASC, l.id ASC
       LIMIT $limit`,
    )
    .all({
      jobId,
      runId,
      afterId,
      limit: limit ?? -1,
    }) as Record<string, unknown>[];

  return rows.map(rowToJobRunLog);
}

function isProcessAlive(pid: number | null): boolean {
  if (pid === null) {
    return false;
  }

  try {
    process.kill(pid, 0);

    return true;
  } catch (err) {
    return (
      err instanceof Error &&
      'code' in err &&
      (err as Error & { code: unknown }).code === 'EPERM'
    );
  }
}

type RecoverInterruptedJobRunsProps = {
  db: Database;
  isJobActive: (jobId: number) => boolean;
};

export function recoverInterruptedJobRuns({
  db,
  isJobActive,
}: RecoverInterruptedJobRunsProps): number {
  const rows = db
    .prepare(
      "SELECT id, job_id, started_at, owner_pid FROM job_runs WHERE status = 'running' ORDER BY id ASC",
    )
    .all() as Array<{
    id: number;
    job_id: number;
    started_at: number;
    owner_pid: number | null;
  }>;

  const interruptedRows = rows.filter((row) => {
    const ownerIsAlive =
      row.owner_pid === process.pid
        ? isJobActive(row.job_id)
        : isProcessAlive(row.owner_pid);

    return !ownerIsAlive;
  });

  const recoverRun = db.transaction((row: (typeof interruptedRows)[number]) => {
    const now = Date.now();
    const message = 'AppWeaver stopped before the job run completed.';

    const claimed = db
      .prepare(
        "UPDATE job_runs SET finished_at = ?, status = 'error', error = ? WHERE id = ? AND status = 'running'",
      )
      .run(now, message, row.id);

    if (claimed.changes === 0) {
      return false;
    }

    appendJobRunLog({
      db,
      runId: row.id,
      event: 'run_interrupted',
      level: 'error',
      message,
      details: null,
      occurredAt: now,
    });

    const job = getJob(db, row.job_id);

    if (job) {
      const runCount = getJobRunCount(db, job.id);
      const nextRunAt = getNextRunAt(job, now, runCount);

      updateJobRunTimes(db, job.id, row.started_at, nextRunAt);

      if (nextRunAt !== null) {
        appendJobRunLog({
          db,
          runId: row.id,
          event: 'next_run_scheduled',
          level: 'info',
          message: `Next run scheduled for ${new Date(nextRunAt).toISOString()}.`,
          details: { next_run_at: nextRunAt },
          occurredAt: now,
        });
      }
    }

    appendJobRunLog({
      db,
      runId: row.id,
      event: 'run_finished',
      level: 'error',
      message: 'Run marked as failed during startup recovery.',
      details: { status: 'error' },
      occurredAt: now,
    });

    return true;
  });

  let recoveredCount = 0;

  for (const row of interruptedRows) {
    if (recoverRun(row)) {
      recoveredCount += 1;
    }
  }

  return recoveredCount;
}
