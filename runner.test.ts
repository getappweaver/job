import { Database } from 'bun:sqlite';
import { expect, mock, test } from 'bun:test';

import type { PluginContext } from '@src/core/plugin';

import {
  createJob,
  createJobTables,
  getJob,
  listJobLogs,
  listJobRuns,
} from './db';
import { runJob } from './runner';

function createPluginToolJob(db: Database) {
  return createJob(db, {
    name: 'Radar fetch',
    execution_type: 'cron',
    schedule: '5 * * * *',
    schedule_description: 'Hourly',
    prompt: 'Run plugin tool nr.fetch_evaluate.',
    backend: 'opencode',
    provider: 'local',
    model: '',
    mode: 'agent',
    workspace_target: 'appweaver',
    budget_sats: null,
    instructions: null,
    maxRuns: null,
    task: {
      type: 'plugin-tool',
      alias: 'nr',
      toolName: 'fetch_evaluate',
      input: {},
    },
  });
}

function pluginContext(executePluginTool: PluginContext['executePluginTool']) {
  return {
    executePluginTool,
    sendDm: async () => 'event-id',
    sendWebPush: async () => ({ status: 'disabled' as const }),
    agent: {
      run: mock(() => {
        throw new Error('agent must not run for plugin-tool jobs');
      }),
    },
  } as unknown as PluginContext;
}

test('migrates existing jobs to agent-prompt tasks', () => {
  const db = new Database(':memory:', { strict: true });
  createJobTables(db);

  const result = db
    .prepare(
      `INSERT INTO jobs (
         name, schedule, schedule_description, prompt,
         enabled, created_at, last_run_at, next_run_at,
         backend, provider, model, mode, workspace_target,
         session_id, budget_sats, instructions,
         execution_type, run_at, max_runs
       ) VALUES (
         $name, $schedule, $description, $prompt,
         1, 1, NULL, 2,
         'opencode', 'local', '', 'agent', 'appweaver',
         NULL, NULL, NULL,
         'cron', NULL, NULL
       )`,
    )
    .run({
      name: 'Existing job',
      schedule: '5 * * * *',
      description: 'Hourly',
      prompt: 'Existing prompt',
    });

  expect(getJob(db, Number(result.lastInsertRowid))).toMatchObject({
    task_type: 'agent-prompt',
    tool_alias: null,
    tool_name: null,
    tool_input: null,
  });

  db.close();
});

test('runs plugin-tool jobs directly and persists their output', async () => {
  const db = new Database(':memory:', { strict: true });
  createJobTables(db);
  const job = createPluginToolJob(db);
  const executePluginTool = mock(async () => 'Fetch complete.');
  const ctx = pluginContext(executePluginTool);

  const result = await runJob({
    job,
    pluginDb: db,
    ctx,
    trigger: 'manual',
    scheduledFor: null,
  });

  expect(result).toEqual({ status: 'success' });

  expect(executePluginTool).toHaveBeenCalledWith({
    alias: 'nr',
    toolName: 'fetch_evaluate',
    input: {},
  });

  expect(listJobRuns(db, job.id, 1)[0]).toMatchObject({
    status: 'success',
    output: 'Fetch complete.',
    error: null,
  });

  expect(
    listJobLogs({
      db,
      jobId: job.id,
      runId: null,
      afterId: null,
      limit: null,
    }).map((entry) => entry.event),
  ).toContain('tool_finished');

  db.close();
});

test('marks plugin-tool jobs failed when direct execution rejects', async () => {
  const db = new Database(':memory:', { strict: true });
  createJobTables(db);
  const job = createPluginToolJob(db);

  const ctx = pluginContext(async () => {
    throw new Error('fetch failed');
  });

  const result = await runJob({
    job,
    pluginDb: db,
    ctx,
    trigger: 'manual',
    scheduledFor: null,
  });

  expect(result).toEqual({ status: 'failed' });

  expect(listJobRuns(db, job.id, 1)[0]).toMatchObject({
    status: 'error',
    output: null,
    error: 'fetch failed',
  });

  db.close();
});
