// ---------------------------------------------------------------------------
// plugins/jobs/runner.ts — Execute a single job: build backend from job row, run, store result
//
// Backend and session come from the job (session_id only for cron; one-time always new session).
// Output is stored in job_runs; no DM.
// ---------------------------------------------------------------------------
import { join } from 'path';

import type { Database } from 'bun:sqlite';

import { createBackend } from '@src/backends/factory';
import { getOutputString } from '@src/backends/types';
import type { PluginContext } from '@src/core/plugin';
import { log } from '@src/logger';
import { dmBotRoot } from '@src/paths';

import {
  disableJob,
  getJobRunCount,
  getNextRunAt,
  insertJobRun,
  updateJobRun,
  updateJobRunTimes,
  updateJobSessionId,
} from './db';
import type { Job } from './types';

export type RunJobProps = {
  job: Job;
  pluginDb: Database;
  ctx: PluginContext;
};

/**
 * Run a single job: build backend from job row, resolve session (cron: reuse job.session_id or create and persist), run message, update run and job times.
 */
export async function runJob({
  job,
  pluginDb,
  ctx,
}: RunJobProps): Promise<void> {
  const runId = insertJobRun(pluginDb, job.id);
  const startedAt = Date.now();

  const executionPreamble = [
    'You are executing a scheduled job right now.',
    'This is not a request to create, plan, or reschedule a job.',
    'Perform the requested task immediately using the schedule context below.',
    'If it is a reminder, send the reminder message directly as if it is due now.',
    'Do not ask clarifying questions about timing or scheduling.',
    'Be concise and action-oriented.',
    '',
    `Job name: ${job.name}`,
    `Execution type: ${job.execution_type}`,
    `Scheduled as: ${job.schedule_description}`,
    `Current time: ${new Date(startedAt).toISOString()}`,
  ].join('\n');

  const effectiveContent =
    job.instructions != null && job.instructions.trim().length > 0
      ? `${executionPreamble}\n\nAdditional instructions:\n${job.instructions}\n\nJob request:\n${job.prompt}`
      : `${executionPreamble}\n\nJob request:\n${job.prompt}`;

  let output: string;
  let success: boolean;

  try {
    const backend = createBackend({
      backendName: job.backend,
      dmBotRoot: dmBotRoot,
      cursorMode: job.mode,
      opencodeAgentName: job.backend === 'opencode' ? job.mode : null,
      attachUrl: null,
      modelOverride: job.model,
      providerName: job.provider,
    });

    const sessionId =
      job.execution_type === 'cron' && job.session_id != null
        ? job.session_id
        : await backend.createSession(dmBotRoot);

    const cwd =
      job.workspace_target === 'appweaver' ? dmBotRoot : join(dmBotRoot, '..');

    const result = await backend.runMessage({
      sessionId,
      content: effectiveContent,
      cursorMode: job.mode,
      opencodeAgentName: job.backend === 'opencode' ? job.mode : null,
      cwd,
      getRoutstrSkKey: ctx.getRoutstrSkKey,
      modelOverride: job.model,
      onAgentStreamChunk: null,
      streamAbortSignal: null,
    });

    output = getOutputString(result);
    success = result.type === 'success';

    if (job.execution_type === 'cron' && job.session_id == null) {
      updateJobSessionId(pluginDb, job.id, sessionId);
    }
  } catch (err) {
    const errMsg = String(err);

    ctx
      .sendDm(`[Job: ${job.name}]\nError: ${errMsg}`)
      .catch((e) => log.error(`Failed to send error reply: ${String(e)}`));

    updateJobRun(pluginDb, runId, 'error', null, errMsg, null);

    const runCount = getJobRunCount(pluginDb, job.id);
    const nextRunAt = getNextRunAt(job, startedAt, runCount);

    updateJobRunTimes(pluginDb, job.id, startedAt, nextRunAt ?? null);

    return;
  }

  ctx
    .sendDm(`[Job: ${job.name}]\n${output || '(no output)'}`)
    .catch((e) => log.error(`Failed to send reply: ${String(e)}`));

  updateJobRun(
    pluginDb,
    runId,
    success ? 'success' : 'error',
    output,
    success ? null : output,
    null,
  );

  if (success && job.execution_type === 'one-time') {
    updateJobRunTimes(pluginDb, job.id, startedAt, null);
    disableJob(pluginDb, job.id);

    return;
  }

  const runCount = getJobRunCount(pluginDb, job.id);
  const nextRunAt = getNextRunAt(job, startedAt, runCount);

  updateJobRunTimes(pluginDb, job.id, startedAt, nextRunAt ?? null);
}
