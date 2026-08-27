// ---------------------------------------------------------------------------
// plugins/job/commands/ai/execute-tool.ts — CLI tool execution (list/show/create)
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { PluginAgentService } from '@src/core/plugin';

import { getJob, listJobs } from '../../db';
import { createDraftSessionId, storeDraft } from '../../drafts';
import { formatContextLine, formatNextRun } from '../../format';
import type { Job } from '../../types';
import { JobDraftInputSchema } from '../../types';

import { formatCreateWithPreview } from './format-preview';
import { getCurrentTimeContext } from './prompts';
import type { JobToolCall } from './schemas';

function formatNextRunLocal(nextRunAt: number | null): string {
  return formatNextRun(nextRunAt);
}

function scheduleCol(props: {
  executionType: 'cron' | 'one-time';
  scheduleDescription: string;
  maxRuns: number | null;
}): string {
  const { executionType, scheduleDescription, maxRuns } = props;

  if (executionType === 'cron') {
    return maxRuns != null
      ? `${scheduleDescription} (max ${maxRuns})`
      : scheduleDescription;
  }

  return `${scheduleDescription} (once)`;
}

function formatJobSummaryList(db: Database): string {
  const jobs = listJobs(db);

  if (jobs.length === 0) {
    return 'No jobs.';
  }

  const escapeCell = (s: string): string => s.replace(/\|/g, '\\|');
  const header = '| ID | En | Name | Schedule | Next Run | Context |';
  const sep = '| --- | --- | --- | --- | --- | --- |';

  const rows = jobs.map((job: Job) => {
    return `| ${escapeCell(String(job.id))} | ${job.enabled ? '✓' : '—'} | ${escapeCell(job.name)} | ${escapeCell(scheduleCol({ executionType: job.execution_type, scheduleDescription: job.schedule_description, maxRuns: job.max_runs ?? null }))} | ${escapeCell(formatNextRunLocal(job.next_run_at))} | ${escapeCell(formatContextLine(job))} |`;
  });

  return `## Jobs\n\n${[header, sep, ...rows].join('\n')}`;
}

function formatJobDetail(db: Database, id: number): string {
  const job = getJob(db, id);

  if (!job) {
    return `Job not found: ${id}`;
  }

  const scheduleLine =
    job.execution_type === 'cron'
      ? `Schedule: ${job.schedule}${job.max_runs != null ? ` (max ${job.max_runs} runs)` : ''}`
      : `Run at: ${job.run_at != null ? formatNextRunLocal(job.run_at) : '—'} (once)`;

  const lines = [
    `ID: ${job.id}`,
    `Name: ${job.name}`,
    `Type: ${job.execution_type}`,
    scheduleLine,
    `When: ${job.schedule_description}`,
    `Prompt: ${job.prompt.slice(0, 80)}${job.prompt.length > 80 ? '…' : ''}`,
    `Enabled: ${job.enabled ? 'yes' : 'no'}`,
    `Next run: ${formatNextRunLocal(job.next_run_at)}`,
    `Backend: ${job.backend}`,
    `Provider: ${job.provider}`,
    `Model: ${job.model || '(default)'}`,
    `Mode: ${job.mode}`,
    `Budget: ${job.budget_sats != null ? `${job.budget_sats} sats (auto-flow)` : '—'}`,
    `Instructions: ${job.instructions != null ? job.instructions.slice(0, 120) + (job.instructions.length > 120 ? '…' : '') : '—'}`,
  ];

  return lines.join('\n');
}

function formatCurrentTimeContext(): string {
  const tc = getCurrentTimeContext();

  return [
    `Current date and time (UTC): ${tc.nowUtc}`,
    `Current date and time (user's timezone): ${tc.nowLocal}`,
    `User's timezone: ${tc.timeZone}`,
  ].join('\n');
}

export async function executeTool({
  alias,
  call,
  db,
  prefix,
  agent,
}: {
  alias: string;
  call: JobToolCall;
  db: Database;
  prefix: string;
  agent: PluginAgentService;
}): Promise<string> {
  switch (call.type) {
    case 'list':
      return formatJobSummaryList(db);
    case 'show':
      return formatJobDetail(db, call.input.id);
    case 'context':
      return formatCurrentTimeContext();
    case 'create': {
      const defaults = agent.getDefaults();

      const fullInput = JobDraftInputSchema.parse({
        ...call.input,
        backend: defaults.backend,
        provider: defaults.provider,
        model: defaults.model ?? '',
        mode: defaults.mode,
        workspace_target: defaults.workspaceTarget,
      });

      const draftId = storeDraft(db, {
        sessionId: createDraftSessionId(),
        kind: 'create',
        input: fullInput,
        originalPrompt: call.original_prompt,
      });

      return formatCreateWithPreview({
        draftId: String(draftId),
        input: fullInput,
        prefix,
        alias,
      });
    }
  }
}
