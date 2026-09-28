// ---------------------------------------------------------------------------
// plugins/job/db/jobs.ts — jobs table CRUD + scheduling fields
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { SchedulerTaskV2 } from '@src/capabilities/scheduler.v2';
import type { SchedulerTaskV3 } from '@src/capabilities/scheduler.v3';

import type { Job, JobDraftInput } from '../types';

import { getNextRunAt, validateSchedule } from './cron-schedule';
import { rowToJob } from './row-map';

type UpdateJobDetailsProps = {
  db: Database;
  id: number;
  name: string;
  model: string;
  modelConfigured: boolean;
  modelSourceId: string | null;
  workspaceTarget: 'parent' | 'appweaver' | null;
  stickySession: boolean;
  prompt: string;
  instructions: string | null;
};

export function getJobRunCount(db: Database, jobId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) as c FROM job_runs WHERE job_id = $jobId')
    .get({ jobId }) as { c: number };

  return Number(row?.c ?? 0);
}

type WithOptionalExecutionSettings<T> = T extends JobDraftInput
  ? Omit<T, 'model_source_id' | 'sticky_session' | 'model_configured'> &
      Partial<
        Pick<T, 'model_source_id' | 'sticky_session' | 'model_configured'>
      >
  : never;
type CreateJobInput = WithOptionalExecutionSettings<JobDraftInput> & {
  task?: SchedulerTaskV2 | SchedulerTaskV3;
};

function storedTask(input: CreateJobInput) {
  const task = input.task;

  return task?.type === 'plugin-tool'
    ? {
        taskType: task.type,
        toolAlias: task.alias,
        toolName: task.toolName,
        toolInputJson: JSON.stringify(task.input),
      }
    : {
        taskType: 'agent-prompt',
        toolAlias: null,
        toolName: null,
        toolInputJson: null,
      };
}

export function createJob(db: Database, input: CreateJobInput): Job {
  const now = Date.now();
  const task = storedTask(input);

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
              backend, provider, model, model_configured, workspace_target, model_source_id, sticky_session,
           session_id, budget_sats, instructions,
            execution_type, run_at, max_runs,
            task_type, tool_alias, tool_name, tool_input_json
         )
         VALUES (
           $name, $schedule, $scheduleDescription, $prompt,
           1, $createdAt, NULL, $nextRunAt,
              $backend, $provider, $model, $modelConfigured, $workspaceTarget, $modelSourceId, $stickySession,
           NULL, $budgetSats, $instructions,
            'cron', NULL, $maxRuns,
            $taskType, $toolAlias, $toolName, $toolInputJson
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
        modelConfigured: input.model_configured ? 1 : 0,
        workspaceTarget: input.workspace_target ?? 'inherit',
        modelSourceId: input.model_source_id ?? null,
        stickySession: input.sticky_session ? 1 : 0,
        budgetSats: input.budget_sats,
        instructions: input.instructions,
        maxRuns: input.maxRuns,
        ...task,
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
             backend, provider, model, model_configured, workspace_target, model_source_id, sticky_session,
           session_id, budget_sats, instructions,
            execution_type, run_at, max_runs,
            task_type, tool_alias, tool_name, tool_input_json
         )
         VALUES (
           $name, $schedule, $scheduleDescription, $prompt,
           1, $createdAt, NULL, $nextRunAt,
             $backend, $provider, $model, $modelConfigured, $workspaceTarget, $modelSourceId, $stickySession,
           NULL, $budgetSats, $instructions,
            'one-time', $runAt, NULL,
            $taskType, $toolAlias, $toolName, $toolInputJson
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
      modelConfigured: input.model_configured ? 1 : 0,
      workspaceTarget: input.workspace_target ?? 'inherit',
      modelSourceId: input.model_source_id ?? null,
      stickySession: input.sticky_session ? 1 : 0,
      budgetSats: input.budget_sats,
      instructions: input.instructions,
      runAt: runAtMs,
      ...task,
    });

  return getJob(db, Number(info.lastInsertRowid))!;
}

export function updateJobTask(
  db: Database,
  id: number,
  task: SchedulerTaskV2 | SchedulerTaskV3,
): Job | null {
  const stored =
    task.type === 'plugin-tool'
      ? {
          prompt: `Run plugin tool ${task.alias}.${task.toolName}.`,
          taskType: task.type,
          toolAlias: task.alias,
          toolName: task.toolName,
          toolInputJson: JSON.stringify(task.input),
        }
      : {
          prompt: task.prompt,
          taskType: task.type,
          toolAlias: null,
          toolName: null,
          toolInputJson: null,
        };

  const info = db
    .prepare(
      `UPDATE jobs
       SET prompt = $prompt, task_type = $taskType,
           tool_alias = $toolAlias, tool_name = $toolName,
           tool_input_json = $toolInputJson
       WHERE id = $id`,
    )
    .run({ id, ...stored });

  return info.changes > 0 ? getJob(db, id) : null;
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
  modelConfigured,
  modelSourceId,
  workspaceTarget,
  stickySession,
  prompt,
  instructions,
}: UpdateJobDetailsProps): Job | null {
  const info = db
    .prepare(
      `UPDATE jobs
        SET name = $name, model = $model, model_configured = $modelConfigured, model_source_id = $modelSourceId,
            workspace_target = $workspaceTarget, sticky_session = $stickySession,
            session_id = CASE WHEN sticky_session != $stickySession OR model_source_id IS NOT $modelSourceId OR workspace_target != $workspaceTarget THEN NULL ELSE session_id END,
            session_source_id = CASE WHEN sticky_session != $stickySession OR model_source_id IS NOT $modelSourceId OR workspace_target != $workspaceTarget THEN NULL ELSE session_source_id END,
            session_workspace_target = CASE WHEN sticky_session != $stickySession OR model_source_id IS NOT $modelSourceId OR workspace_target != $workspaceTarget THEN NULL ELSE session_workspace_target END,
            prompt = $prompt, instructions = $instructions
       WHERE id = $id`,
    )
    .run({
      id,
      name,
      model,
      modelConfigured: modelConfigured ? 1 : 0,
      modelSourceId,
      workspaceTarget: workspaceTarget ?? 'inherit',
      stickySession: stickySession ? 1 : 0,
      prompt,
      instructions,
    });

  return info.changes > 0 ? getJob(db, id) : null;
}

export function deleteJob(db: Database, id: number): boolean {
  const info = db.prepare('DELETE FROM jobs WHERE id = ?').run(id);

  return info.changes > 0;
}

type UpdateJobSessionIdProps = {
  db: Database;
  id: number;
  sessionId: string;
  sourceId: string;
  workspaceTarget: 'parent' | 'appweaver';
};

export function updateJobSessionId({
  db,
  id,
  sessionId,
  sourceId,
  workspaceTarget,
}: UpdateJobSessionIdProps): void {
  db.prepare(
    'UPDATE jobs SET session_id = ?, session_source_id = ?, session_workspace_target = ? WHERE id = ?',
  ).run(sessionId, sourceId, workspaceTarget, id);
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
