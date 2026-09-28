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

  db.run(`CREATE TABLE jobs (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, schedule TEXT NOT NULL,
    schedule_description TEXT NOT NULL, prompt TEXT NOT NULL,
    enabled INTEGER NOT NULL, created_at INTEGER NOT NULL,
    last_run_at INTEGER, next_run_at INTEGER, backend TEXT NOT NULL,
    provider TEXT NOT NULL, model TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'agent',
    workspace_target TEXT NOT NULL, session_id TEXT, budget_sats INTEGER,
    instructions TEXT, execution_type TEXT NOT NULL, run_at INTEGER, max_runs INTEGER
  )`);

  createJobTables(db);

  const result = db
    .prepare(
      `INSERT INTO jobs (
         name, schedule, schedule_description, prompt,
         enabled, created_at, last_run_at, next_run_at,
         backend, provider, model, workspace_target,
         session_id, budget_sats, instructions,
         execution_type, run_at, max_runs
       ) VALUES (
         $name, $schedule, $description, $prompt,
         1, 1, NULL, 2,
           'opencode', 'local', 'openai/legacy', 'appweaver',
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
    model_configured: false,
    sticky_session: false,
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

test('jobs use independent sessions by default and sticky sessions follow their source', async () => {
  const db = new Database(':memory:', { strict: true });
  createJobTables(db);

  const job = createJob(db, {
    name: 'Daily brief',
    execution_type: 'cron',
    schedule: '5 * * * *',
    schedule_description: 'Hourly',
    prompt: 'Brief',
    backend: 'opencode',
    provider: 'local',
    model: '',
    workspace_target: null,
    budget_sats: null,
    instructions: null,
    maxRuns: null,
  });

  let activeSource = 'core-id';
  let sequence = 0;

  const calls: Array<{
    sessionId: string | null;
    modelSourceId: string | null | undefined;
  }> = [];

  const ctx = {
    workspace: { getActiveTarget: () => 'appweaver' },
    modelSource: { getActiveProviderId: () => activeSource },
    capabilities: { listProviders: () => [] },
    sendDm: async () => {},
    sendWebPush: async () => ({ status: 'disabled' as const }),
    agent: {
      run: async (input: {
        sessionId: string | null;
        modelSourceId?: string | null;
      }) => {
        calls.push({
          sessionId: input.sessionId,
          modelSourceId: input.modelSourceId,
        });

        return {
          type: 'success' as const,
          outputs: [{ type: 'text' as const, value: 'Done' }],
          sessionId: input.sessionId ?? `session-${++sequence}`,
          modelSourceId: input.modelSourceId!,
          backend: 'opencode' as const,
        };
      },
    },
  } as unknown as PluginContext;

  const run = (current = getJob(db, job.id)!) =>
    runJob({
      job: current,
      pluginDb: db,
      ctx,
      trigger: 'manual',
      scheduledFor: null,
    });

  await run();
  await run();
  expect(calls.map((call) => call.sessionId)).toEqual([null, null]);

  expect(getJob(db, job.id)).toMatchObject({
    sticky_session: false,
    session_id: null,
  });

  db.run('UPDATE jobs SET sticky_session = 1 WHERE id = ?', [job.id]);
  await run();
  await run();

  expect(calls.slice(-2).map((call) => call.sessionId)).toEqual([
    null,
    'session-3',
  ]);

  activeSource = 'ppq-id';
  await run();

  expect(calls.at(-1)).toMatchObject({
    sessionId: null,
    modelSourceId: 'ppq-id',
  });

  expect(getJob(db, job.id)).toMatchObject({ session_source_id: 'ppq-id' });
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
