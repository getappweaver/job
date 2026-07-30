import { randomUUID } from 'node:crypto';

import type { Database } from 'bun:sqlite';

export type SchedulerResourceRow = {
  resourceId: string;
  draftId: number | null;
  jobId: number | null;
};

export function createSchedulerResourcesTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS job_scheduler_resources (
      resource_id TEXT PRIMARY KEY,
      draft_id INTEGER REFERENCES job_drafts(id) ON DELETE SET NULL,
      job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
      desired_enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    )
  `);
}

type CreateSchedulerResourceProps = {
  db: Database;
  draftId: number;
  enabled: boolean;
};

export function createSchedulerResource({
  db,
  draftId,
  enabled,
}: CreateSchedulerResourceProps): string {
  const resourceId = randomUUID();

  db.prepare(
    `INSERT INTO job_scheduler_resources (
       resource_id, draft_id, job_id, desired_enabled, created_at
     ) VALUES (?, ?, NULL, ?, ?)`,
  ).run(resourceId, draftId, enabled ? 1 : 0, Date.now());

  return resourceId;
}

type CreateSchedulerResourceForJobProps = {
  db: Database;
  jobId: number;
  enabled: boolean;
};

export function createSchedulerResourceForJob({
  db,
  jobId,
  enabled,
}: CreateSchedulerResourceForJobProps): string {
  const resourceId = randomUUID();

  db.prepare(
    `INSERT INTO job_scheduler_resources (
       resource_id, draft_id, job_id, desired_enabled, created_at
     ) VALUES (?, NULL, ?, ?, ?)`,
  ).run(resourceId, jobId, enabled ? 1 : 0, Date.now());

  return resourceId;
}

type LinkSchedulerResourceToJobProps = {
  db: Database;
  draftId: number;
  jobId: number;
};

export function linkSchedulerResourceToJob({
  db,
  draftId,
  jobId,
}: LinkSchedulerResourceToJobProps): void {
  const mapping = db
    .prepare(
      'SELECT desired_enabled FROM job_scheduler_resources WHERE draft_id = ?',
    )
    .get(draftId) as { desired_enabled: number } | undefined;

  db.prepare(
    `UPDATE job_scheduler_resources
     SET draft_id = NULL, job_id = ?
     WHERE draft_id = ?`,
  ).run(jobId, draftId);

  if (mapping?.desired_enabled === 0) {
    db.prepare(
      'UPDATE jobs SET enabled = 0, next_run_at = NULL WHERE id = ?',
    ).run(jobId);
  }
}

export function getSchedulerResource(
  db: Database,
  resourceId: string,
): SchedulerResourceRow | null {
  const row = db
    .prepare(
      `SELECT resource_id, draft_id, job_id
       FROM job_scheduler_resources
       WHERE resource_id = ?`,
    )
    .get(resourceId) as
    | { resource_id: string; draft_id: number | null; job_id: number | null }
    | undefined;

  return row
    ? {
        resourceId: row.resource_id,
        draftId: row.draft_id,
        jobId: row.job_id,
      }
    : null;
}

export function listSchedulerResources(db: Database): SchedulerResourceRow[] {
  const rows = db
    .prepare(
      `SELECT resource_id, draft_id, job_id
       FROM job_scheduler_resources
       ORDER BY created_at ASC`,
    )
    .all() as Array<{
    resource_id: string;
    draft_id: number | null;
    job_id: number | null;
  }>;

  return rows.map((row) => ({
    resourceId: row.resource_id,
    draftId: row.draft_id,
    jobId: row.job_id,
  }));
}
