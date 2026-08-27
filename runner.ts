// ---------------------------------------------------------------------------
// plugins/jobs/runner.ts — Execute a single job: build backend from job row, run, store result
//
// Backend and session come from the job (session_id only for cron; one-time always new session).
// Output is stored in job_runs; lifecycle events are stored in job_run_logs; results are sent by DM.
// ---------------------------------------------------------------------------
import type { Database } from 'bun:sqlite';

import type {
  AgentStreamChunk,
  AgentToolCall,
} from '@src/backends/agent-stream-chunk';
import { getOutputString, type AgentRunResult } from '@src/backends/types';
import type { PluginContext } from '@src/core/plugin';
import { log } from '@src/logger';

import {
  appendJobRunLog,
  disableJob,
  getJobRunCount,
  getNextRunAt,
  insertJobRun,
  updateJobRun,
  updateJobRunTimes,
  updateJobSessionId,
} from './db';
import type { Job, JobRunStatus, JobRunTrigger } from './types';

export type RunJobProps = {
  job: Job;
  pluginDb: Database;
  ctx: PluginContext;
  trigger: JobRunTrigger;
  scheduledFor: number | null;
};

export type RunJobResult =
  { status: 'success' } | { status: 'failed' } | { status: 'already_running' };

const activeJobIds = new Set<number>();

class JobAlreadyRunningError extends Error {}

export function isJobActive(jobId: number): boolean {
  return activeJobIds.has(jobId);
}

type SendJobNotificationProps = {
  ctx: PluginContext;
  pluginDb: Database;
  runId: number;
  jobName: string;
  body: string;
};

async function sendJobDm({
  ctx,
  pluginDb,
  runId,
  jobName,
  body,
}: SendJobNotificationProps): Promise<void> {
  const startedAt = Date.now();

  try {
    await ctx.sendDm(`[Job: ${jobName}]\n${body}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);

    try {
      appendJobRunLog({
        db: pluginDb,
        runId,
        event: 'dm_failed',
        level: 'error',
        message: error,
        details: { duration_ms: Date.now() - startedAt },
        occurredAt: Date.now(),
      });
    } catch (logError) {
      log.error(
        `Failed to store DM failure for job ${jobName}: ${String(logError)}`,
      );
    }

    log.error(`Failed to send reply for job ${jobName}: ${error}`);

    return;
  }

  try {
    appendJobRunLog({
      db: pluginDb,
      runId,
      event: 'dm_sent',
      level: 'success',
      message: 'Result sent by Nostr DM.',
      details: { duration_ms: Date.now() - startedAt },
      occurredAt: Date.now(),
    });
  } catch (err) {
    log.error(`Failed to store DM success for job ${jobName}: ${String(err)}`);
  }
}

async function sendJobPush({
  ctx,
  pluginDb,
  runId,
  jobName,
  body,
}: SendJobNotificationProps): Promise<void> {
  const startedAt = Date.now();

  try {
    const maxBodyLength = 2_000;

    const result = await ctx.sendWebPush({
      title: `Job: ${jobName}`,
      body:
        body.length > maxBodyLength ? `${body.slice(0, maxBodyLength)}…` : body,
      url: '/?command=job&subcommand=list',
    });

    if (result.status === 'disabled') {
      appendJobRunLog({
        db: pluginDb,
        runId,
        event: 'push_skipped',
        level: 'info',
        message: 'Web Push is not configured.',
        details: { duration_ms: Date.now() - startedAt },
        occurredAt: Date.now(),
      });

      return;
    }

    const accepted = result.accepted > 0;
    const attempted = result.attempted > 0;

    appendJobRunLog({
      db: pluginDb,
      runId,
      event: attempted
        ? accepted
          ? 'push_sent'
          : 'push_failed'
        : 'push_skipped',
      level: attempted ? (accepted ? 'success' : 'error') : 'info',
      message: attempted
        ? `${result.accepted}/${result.attempted} push notification(s) accepted by push service.`
        : 'No Web Push subscriptions are registered.',
      details: {
        attempted: result.attempted,
        accepted: result.accepted,
        failed: result.failed,
        removed: result.removed,
        duration_ms: Date.now() - startedAt,
      },
      occurredAt: Date.now(),
    });

    if (result.failed > 0) {
      log.warn(
        `Web Push for job ${jobName}: ${result.accepted} accepted, ${result.failed} failed, ${result.removed} stale removed.`,
      );
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);

    try {
      appendJobRunLog({
        db: pluginDb,
        runId,
        event: 'push_failed',
        level: 'error',
        message: error,
        details: { duration_ms: Date.now() - startedAt },
        occurredAt: Date.now(),
      });
    } catch (logError) {
      log.error(
        `Failed to store Web Push failure for job ${jobName}: ${String(logError)}`,
      );
    }

    log.error(`Failed to send Web Push for job ${jobName}: ${error}`);
  }
}

async function sendJobNotifications(
  props: SendJobNotificationProps,
): Promise<void> {
  await Promise.all([sendJobDm(props), sendJobPush(props)]);
}

type JobSessionLog = {
  sessionId: string;
  reused: boolean;
  occurredAt: number;
};

type AppendJobSessionLogProps = {
  pluginDb: Database;
  runId: number;
  session: JobSessionLog;
};

function appendJobSessionLog({
  pluginDb,
  runId,
  session,
}: AppendJobSessionLogProps): void {
  appendJobRunLog({
    db: pluginDb,
    runId,
    event: session.reused ? 'session_reused' : 'session_created',
    level: 'info',
    message: session.reused
      ? `Reusing agent session ${session.sessionId}.`
      : `Created agent session ${session.sessionId}.`,
    details: { session_id: session.sessionId },
    occurredAt: session.occurredAt,
  });
}

type CreateBackendStreamLoggerProps = {
  pluginDb: Database;
  runId: number;
};

function normalizedToolStatus(
  status: AgentToolCall['status'],
): 'started' | 'finished' | 'failed' | null {
  if (status === 'completed') {
    return 'finished';
  }

  if (status === 'error') {
    return 'failed';
  }

  return status === 'running' ? 'started' : null;
}

function toolMessage(tool: AgentToolCall): string {
  const command = tool.input.command;

  if (typeof command === 'string' && command.trim()) {
    return command;
  }

  return tool.title?.trim() || tool.tool;
}

function createBackendStreamLogger({
  pluginDb,
  runId,
}: CreateBackendStreamLoggerProps): (chunk: AgentStreamChunk) => void {
  const toolStatuses = new Map<string, string>();
  const summaries = new Map<string, string>();

  return (chunk) => {
    try {
      if (chunk.kind === 'tool') {
        const status = normalizedToolStatus(chunk.tool.status);

        if (status === null) {
          return;
        }

        if (toolStatuses.get(chunk.tool.callId) === status) {
          return;
        }

        toolStatuses.set(chunk.tool.callId, status);

        appendJobRunLog({
          db: pluginDb,
          runId,
          event:
            status === 'started'
              ? 'tool_started'
              : status === 'finished'
                ? 'tool_finished'
                : 'tool_failed',
          level:
            status === 'failed'
              ? 'error'
              : status === 'finished'
                ? 'success'
                : 'info',
          message: toolMessage(chunk.tool),
          details: {
            tool: chunk.tool.tool,
            call_id: chunk.tool.callId,
            status: chunk.tool.status,
            input: chunk.tool.input,
            title: chunk.tool.title,
            raw: chunk.tool.raw,
            output: chunk.tool.output,
            error: chunk.tool.error,
          },
          occurredAt: Date.now(),
        });

        return;
      }

      if (chunk.kind === 'summary') {
        if (summaries.get(chunk.id) === chunk.text) {
          return;
        }

        summaries.set(chunk.id, chunk.text);

        appendJobRunLog({
          db: pluginDb,
          runId,
          event: 'backend_summary',
          level: 'info',
          message: chunk.text,
          details: { summary_id: chunk.id },
          occurredAt: Date.now(),
        });

        return;
      }

      if (chunk.kind === 'status') {
        appendJobRunLog({
          db: pluginDb,
          runId,
          event: 'backend_status',
          level: 'info',
          message: chunk.message ?? `Backend ${chunk.phase}.`,
          details: { phase: chunk.phase },
          occurredAt: Date.now(),
        });

        return;
      }

      if (chunk.kind === 'error') {
        appendJobRunLog({
          db: pluginDb,
          runId,
          event: 'backend_error',
          level: 'error',
          message: chunk.message,
          details: null,
          occurredAt: Date.now(),
        });
      }
    } catch (err) {
      log.error(
        `Failed to store backend stream event for run ${runId}: ${String(err)}`,
      );
    }
  };
}

type FinishJobRunProps = {
  job: Job;
  pluginDb: Database;
  runId: number;
  startedAt: number;
  status: JobRunStatus;
  output: string | null;
  error: string | null;
};

function finishJobRun({
  job,
  pluginDb,
  runId,
  startedAt,
  status,
  output,
  error,
}: FinishJobRunProps): void {
  const finishedAt = Date.now();

  updateJobRun({
    db: pluginDb,
    runId,
    status,
    output,
    error,
    budgetUsedMsats: null,
    finishedAt,
  });

  if (status === 'success' && job.execution_type === 'one-time') {
    updateJobRunTimes(pluginDb, job.id, startedAt, null);
    disableJob(pluginDb, job.id);

    appendJobRunLog({
      db: pluginDb,
      runId,
      event: 'job_disabled',
      level: 'info',
      message: 'One-time job disabled after successful execution.',
      details: null,
      occurredAt: Date.now(),
    });
  } else {
    const runCount = getJobRunCount(pluginDb, job.id);
    const nextRunAt = getNextRunAt(job, finishedAt, runCount);

    updateJobRunTimes(pluginDb, job.id, startedAt, nextRunAt ?? null);

    if (nextRunAt !== null) {
      appendJobRunLog({
        db: pluginDb,
        runId,
        event: 'next_run_scheduled',
        level: 'info',
        message: `Next run scheduled for ${new Date(nextRunAt).toISOString()}.`,
        details: { next_run_at: nextRunAt },
        occurredAt: Date.now(),
      });
    }
  }

  appendJobRunLog({
    db: pluginDb,
    runId,
    event: 'run_finished',
    level: status === 'success' ? 'success' : 'error',
    message:
      status === 'success'
        ? `Run completed in ${finishedAt - startedAt}ms.`
        : `Run failed after ${finishedAt - startedAt}ms.`,
    details: { duration_ms: finishedAt - startedAt, status },
    occurredAt: Date.now(),
  });
}

type PersistJobFailureProps = {
  job: Job;
  pluginDb: Database;
  runId: number;
  startedAt: number;
  error: unknown;
  message: string;
  session: JobSessionLog | null;
};

function persistJobFailure({
  job,
  pluginDb,
  runId,
  startedAt,
  error,
  message,
  session,
}: PersistJobFailureProps): void {
  const persist = pluginDb.transaction(() => {
    if (session !== null) {
      appendJobSessionLog({ pluginDb, runId, session });
    }

    appendJobRunLog({
      db: pluginDb,
      runId,
      event: 'agent_failed',
      level: 'error',
      message,
      details:
        error instanceof Error
          ? { error_name: error.name, stack: error.stack ?? null }
          : null,
      occurredAt: Date.now(),
    });

    finishJobRun({
      job,
      pluginDb,
      runId,
      startedAt,
      status: 'error',
      output: null,
      error: message,
    });
  });

  persist();
}

/**
 * Run a single job: build backend from job row, resolve session (cron: reuse job.session_id or create and persist), run message, update run and job times.
 */
async function runJobOnce({
  job,
  pluginDb,
  ctx,
  trigger,
  scheduledFor,
}: RunJobProps): Promise<boolean> {
  const startedAt = Date.now();

  const createRun = pluginDb.transaction(() => {
    const id = insertJobRun({
      db: pluginDb,
      jobId: job.id,
      startedAt,
      trigger,
      scheduledFor,
      ownerPid: process.pid,
    });

    if (id === null) {
      return null;
    }

    appendJobRunLog({
      db: pluginDb,
      runId: id,
      event: 'run_started',
      level: 'info',
      message:
        trigger === 'manual'
          ? 'Manual job execution started.'
          : trigger === 'retry'
            ? 'Job retry started.'
            : 'Scheduled job execution started.',
      details: {
        trigger,
        scheduled_for: scheduledFor,
        scheduler_delay_ms:
          scheduledFor === null ? null : Math.max(0, startedAt - scheduledFor),
        backend: job.backend,
        provider: job.provider,
        model: job.model,
        mode: job.mode,
        workspace_target: job.workspace_target,
      },
      occurredAt: startedAt,
    });

    return id;
  });

  const runId = createRun();

  if (runId === null) {
    throw new JobAlreadyRunningError();
  }

  const onAgentStreamChunk = createBackendStreamLogger({ pluginDb, runId });
  const streamAbortController = new AbortController();

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

  const existingSessionId =
    job.execution_type === 'cron' ? job.session_id : null;

  let sessionId = existingSessionId;
  let result: AgentRunResult;

  try {
    result = await ctx.agent.run({
      prompt: effectiveContent,
      sessionId,
      backend: job.backend,
      provider: job.provider,
      model: job.model || null,
      mode: job.mode,
      workspaceTarget: job.workspace_target,
      cwd: null,
      onAgentStreamChunk,
      abortSignal: streamAbortController.signal,
      context: {
        runtimeContext: true,
        workspaceInstructions: true,
        agentsInstructions: false,
        extraInstructions: null,
      },
    });

    sessionId = result.sessionId;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);

    persistJobFailure({
      job,
      pluginDb,
      runId,
      startedAt,
      error: err,
      message: errMsg,
      session: null,
    });

    activeJobIds.delete(job.id);

    await sendJobNotifications({
      ctx,
      pluginDb,
      runId,
      jobName: job.name,
      body: `Error: ${errMsg}`,
    });

    return false;
  }

  const reusedSession = existingSessionId !== null;

  const sessionLog: JobSessionLog = {
    sessionId: sessionId!,
    reused: reusedSession,
    occurredAt: Date.now(),
  };

  const output = getOutputString(result);
  const success = result.type === 'success';

  const persistResult = pluginDb.transaction(() => {
    appendJobSessionLog({ pluginDb, runId, session: sessionLog });

    appendJobRunLog({
      db: pluginDb,
      runId,
      event: success ? 'agent_finished' : 'agent_failed',
      level: success ? 'success' : 'error',
      message: success
        ? 'Agent completed successfully.'
        : output || 'Agent returned an error without output.',
      details:
        result.type === 'success'
          ? {
              model: result.model ?? job.model,
              tokens: result.tokens ?? null,
              cost: result.cost ?? null,
            }
          : { status_code: result.statusCode ?? null },
      occurredAt: Date.now(),
    });

    if (job.execution_type === 'cron' && job.session_id == null) {
      updateJobSessionId(pluginDb, job.id, sessionId!);
    }

    finishJobRun({
      job,
      pluginDb,
      runId,
      startedAt,
      status: success ? 'success' : 'error',
      output,
      error: success ? null : output,
    });
  });

  persistResult();

  activeJobIds.delete(job.id);

  await sendJobNotifications({
    ctx,
    pluginDb,
    runId,
    jobName: job.name,
    body: output || '(no output)',
  });

  return success;
}

type FinalizeUnexpectedFailureProps = {
  props: RunJobProps;
  error: unknown;
};

function finalizeUnexpectedFailure({
  props,
  error,
}: FinalizeUnexpectedFailureProps): { runId: number; message: string } | null {
  const row = props.pluginDb
    .prepare(
      `SELECT id, started_at
       FROM job_runs
       WHERE job_id = ? AND owner_pid = ? AND status = 'running'
       ORDER BY id DESC
       LIMIT 1`,
    )
    .get(props.job.id, process.pid) as
    { id: number; started_at: number } | undefined;

  if (!row) {
    return null;
  }

  const message = error instanceof Error ? error.message : String(error);

  const persist = props.pluginDb.transaction(() => {
    appendJobRunLog({
      db: props.pluginDb,
      runId: row.id,
      event: 'run_failed',
      level: 'error',
      message,
      details:
        error instanceof Error
          ? { error_name: error.name, stack: error.stack ?? null }
          : null,
      occurredAt: Date.now(),
    });

    finishJobRun({
      job: props.job,
      pluginDb: props.pluginDb,
      runId: row.id,
      startedAt: row.started_at,
      status: 'error',
      output: null,
      error: message,
    });
  });

  persist();

  return { runId: row.id, message };
}

export async function runJob(props: RunJobProps): Promise<RunJobResult> {
  if (activeJobIds.has(props.job.id)) {
    return { status: 'already_running' };
  }

  activeJobIds.add(props.job.id);

  try {
    const success = await runJobOnce(props);

    return { status: success ? 'success' : 'failed' };
  } catch (err) {
    if (err instanceof JobAlreadyRunningError) {
      return { status: 'already_running' };
    }

    const failure = finalizeUnexpectedFailure({ props, error: err });

    if (failure !== null) {
      activeJobIds.delete(props.job.id);

      await sendJobNotifications({
        ctx: props.ctx,
        pluginDb: props.pluginDb,
        runId: failure.runId,
        jobName: props.job.name,
        body: `Error: ${failure.message}`,
      });

      return { status: 'failed' };
    }

    throw err;
  } finally {
    activeJobIds.delete(props.job.id);
  }
}
