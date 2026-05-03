// ---------------------------------------------------------------------------
// plugins/job/db/tables.ts — SQLite DDL for jobs + job_runs
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
      budget_used_msats INTEGER
    )
  `);

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_jobs_next_run_at ON jobs(next_run_at)',
  );

  db.run('CREATE INDEX IF NOT EXISTS idx_job_runs_job_id ON job_runs(job_id)');

  db.run("UPDATE jobs SET backend = 'cursor' WHERE backend = 'cursor-sdk'");
  db.run("UPDATE jobs SET backend = 'opencode' WHERE backend = 'opencode-sdk'");
}
