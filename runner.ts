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

  const effectiveContent =
    job.instructions != null && job.instructions.trim().length > 0
      ? `Instructions:\n${job.instructions}\n\nJob:\n${job.prompt}`
      : job.prompt;

  let output: string;
  let success: boolean;

  try {
    const backend = createBackend({
      backendName: job.backend,
      dmBotRoot: dmBotRoot,
      mode: job.mode,
      attachUrl: null,
      modelOverride: job.model,
      providerName: job.provider,
    });

    const sessionId =
      job.execution_type === 'cron' && job.session_id != null
        ? job.session_id
        : await backend.createSession({ cwd: dmBotRoot, env: ctx.env });

    const cwd =
      job.workspace_target === 'bot' ? dmBotRoot : join(dmBotRoot, '..');

    const result = await backend.runMessage({
      sessionId,
      content: effectiveContent,
      mode: job.mode,
      cwd,
      env: ctx.env,
      modelOverride: job.model,
    });

    output = getOutputString(result);
    success = result.type === 'success';

    if (job.execution_type === 'cron' && job.session_id == null) {
      updateJobSessionId(pluginDb, job.id, sessionId);
    }
  } catch (err) {
    const errMsg = String(err);

    ctx
      .sendReply(`[Job: ${job.name}]\nError: ${errMsg}`)
      .catch((e) => log.error(`Failed to send error reply: ${String(e)}`));

    updateJobRun(pluginDb, runId, 'error', null, errMsg, null);

    const runCount = getJobRunCount(pluginDb, job.id);
    const nextRunAt = getNextRunAt(job, startedAt, runCount);

    updateJobRunTimes(pluginDb, job.id, startedAt, nextRunAt ?? null);

    return;
  }

  ctx
    .sendReply(`[Job: ${job.name}]\n${output || '(no output)'}`)
    .catch((e) => log.error(`Failed to send reply: ${String(e)}`));

  updateJobRun(
    pluginDb,
    runId,
    success ? 'success' : 'error',
    output,
    success ? null : output,
    null,
  );

  const runCount = getJobRunCount(pluginDb, job.id);
  const nextRunAt = getNextRunAt(job, startedAt, runCount);

  updateJobRunTimes(pluginDb, job.id, startedAt, nextRunAt ?? null);
}
