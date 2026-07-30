// ---------------------------------------------------------------------------
// plugins/job/db/tables.ts — SQLite DDL for jobs, runs, and execution logs
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

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
      budget_used_msats INTEGER,
      trigger_source    TEXT    NOT NULL DEFAULT 'scheduled',
      scheduled_for     INTEGER,
      owner_pid         INTEGER
    )
  `);

  const jobRunColumns = db.query('PRAGMA table_info(job_runs)').all() as Array<{
    name: string;
  }>;

  if (!jobRunColumns.some((column) => column.name === 'trigger_source')) {
    db.run(
      "ALTER TABLE job_runs ADD COLUMN trigger_source TEXT NOT NULL DEFAULT 'scheduled'",
    );
  }

  if (!jobRunColumns.some((column) => column.name === 'scheduled_for')) {
    db.run('ALTER TABLE job_runs ADD COLUMN scheduled_for INTEGER');
  }

  if (!jobRunColumns.some((column) => column.name === 'owner_pid')) {
    db.run('ALTER TABLE job_runs ADD COLUMN owner_pid INTEGER');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS job_run_logs (
      id           INTEGER PRIMARY KEY,
      run_id       INTEGER NOT NULL REFERENCES job_runs(id) ON DELETE CASCADE,
      occurred_at  INTEGER NOT NULL,
      event        TEXT    NOT NULL,
      level        TEXT    NOT NULL,
      message      TEXT    NOT NULL,
      details_json TEXT
    )
  `);

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_jobs_next_run_at ON jobs(next_run_at)',
  );

  db.run('CREATE INDEX IF NOT EXISTS idx_job_runs_job_id ON job_runs(job_id)');

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_job_run_logs_run_time ON job_run_logs(run_id, occurred_at, id)',
  );

  db.run("UPDATE jobs SET backend = 'cursor' WHERE backend = 'cursor-sdk'");
  db.run("UPDATE jobs SET backend = 'opencode' WHERE backend = 'opencode-sdk'");
}

export function createJobRunActiveIndex(db: Database): void {
  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_job_runs_one_running_per_job
    ON job_runs(job_id)
    WHERE status = 'running'
  `);
}
