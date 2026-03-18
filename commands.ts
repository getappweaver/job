// ---------------------------------------------------------------------------
// plugins/job/commands.ts — !job subcommand handler
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { PluginContext, PluginIdentity } from '@src/core/plugin';

import { buildRevisePrompt, formatCreateWithPreview, generateCreateWithParams } from './ai';
import { createJob, deleteJob, disableJob, enableJob, getJob, listJobRuns, listJobs } from './db';
import { deleteDraft, getDraft, listDrafts, storeDraft } from './drafts';
import { runJob } from './runner';
import type { JobDraftInput, Job } from './types';

function formatContextLine(job: Job): string {
  const modelPart = job.model ? job.model : '—';

  return [job.backend, job.provider, modelPart, job.mode].join(' / ');
}

function formatNextRun(nextRunAt: number | null): string {
  if (nextRunAt == null) {
    return '—';
  }

  return new Date(nextRunAt).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export type HandleJobProps = {
  args: string[];
  identity: PluginIdentity;
  helpText: (alias: string) => string[];
  pluginDb: Database;
  ctx: PluginContext;
};

export async function handleJob({
  args,
  identity,
  helpText,
  pluginDb,
  ctx,
}: HandleJobProps): Promise<string> {
  const sub = args[0]?.toLowerCase();
  const rest = args.slice(1);
  const alias = identity.alias;
  const cmd = `!${alias}`;

  if (!sub || sub === 'help') {
    return helpText(alias)
      .concat([`!${alias} help — this message`])
      .join('\n');
  }

  // -------------------------------------------------------------------------
  // ai — forward to handleJobAi (called from init handler before dispatch)
  // -------------------------------------------------------------------------
  if (sub === 'ai') {
    const { handleJobAi } = await import('./ai');

    return handleJobAi({
      args: rest,
      identity,
      pluginDb,
      ctx,
    });
  }

  // -------------------------------------------------------------------------
  // drafts
  // -------------------------------------------------------------------------
  if (sub === 'drafts') {
    const drafts = listDrafts(pluginDb);

    if (drafts.length === 0) {
      return `No pending drafts. Use ${cmd} ai <prompt> to create one.`;
    }

    const lines = drafts.map((d) => {
      const s =
        d.draftInput.execution_type === 'cron' ? d.draftInput.schedule : d.draftInput.run_at;

      return `${d.id} | ${d.draftInput.name} | ${s} | ${d.draftInput.schedule_description}`;
    });

    return `Pending drafts:\n${lines.join('\n')}\n\n${cmd} confirm <id> | ${cmd} revise <id> <corrections> | ${cmd} discard <id>`;
  }

  const draftOrJobId = rest[0]?.trim();

  // -------------------------------------------------------------------------
  // confirm
  // -------------------------------------------------------------------------
  if (sub === 'confirm') {
    if (!draftOrJobId) {
      return `Usage: ${cmd} confirm <draft_id>`;
    }

    const draftId = parseInt(draftOrJobId, 10);

    if (Number.isNaN(draftId)) {
      return `Draft not found: ${draftOrJobId}. Use a numeric draft id (e.g. ${cmd} confirm 1).`;
    }

    const entry = getDraft(pluginDb, draftId);

    if (!entry) {
      return `Draft not found: ${draftId}.`;
    }

    try {
      const job = createJob(pluginDb, entry.draftInput);
      deleteDraft(pluginDb, draftId);

      const budgetLine =
        job.budget_sats != null ? `\nBudget: ${job.budget_sats} sats (auto-flow)` : '';

      return `Job created: ${job.id}\nName: ${job.name}\nWhen: ${job.schedule_description}\nNext run: ${formatNextRun(job.next_run_at)}${budgetLine}`;
    } catch (err) {
      return `Failed to create job: ${String(err)}`;
    }
  }

  // -------------------------------------------------------------------------
  // revise
  // -------------------------------------------------------------------------
  if (sub === 'revise') {
    if (!draftOrJobId) {
      return `Usage: ${cmd} revise <draft_id> <corrections>`;
    }

    const corrections = rest.slice(1).join(' ').trim();

    if (!corrections) {
      return `Usage: ${cmd} revise <draft_id> <corrections>`;
    }

    const draftId = parseInt(draftOrJobId, 10);

    if (Number.isNaN(draftId)) {
      return `Draft not found: ${draftOrJobId}. Use a numeric draft id.`;
    }

    const entry = getDraft(pluginDb, draftId);

    if (!entry) {
      return `Draft not found: ${draftId}.`;
    }

    let input: JobDraftInput;

    try {
      input = await generateCreateWithParams({
        systemPrompt: buildRevisePrompt(entry, corrections),
        runAgent: ctx.runAgent,
        defaults: ctx.defaults,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      return `Failed to revise parameters: ${msg}`;
    }

    const newDraftId = storeDraft(pluginDb, {
      kind: 'create',
      draftInput: input,
      originalPrompt: `${entry.originalPrompt} (revised: ${corrections})`,
    });

    deleteDraft(pluginDb, draftId);

    return [
      `Draft #${draftId} revised. Created new draft #${newDraftId}:`,
      '',
      formatCreateWithPreview(String(newDraftId), input),
      '',
      `To accept the revised draft: ${cmd} confirm ${newDraftId}`,
      `To decline the revised draft: ${cmd} discard ${newDraftId}`,
    ].join('\n');
  }

  // -------------------------------------------------------------------------
  // discard
  // -------------------------------------------------------------------------
  if (sub === 'discard') {
    if (!draftOrJobId) {
      return `Usage: ${cmd} discard <draft_id>`;
    }

    const draftId = parseInt(draftOrJobId, 10);

    if (Number.isNaN(draftId)) {
      return `Draft not found: ${draftOrJobId}. Use a numeric draft id.`;
    }

    if (deleteDraft(pluginDb, draftId)) {
      return `Draft ${draftId} discarded.`;
    }

    return `Draft not found: ${draftId}.`;
  }

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------
  if (sub === 'list') {
    const jobs = listJobs(pluginDb);

    if (jobs.length === 0) {
      return `No jobs. Use ${cmd} ai <prompt> to add one.`;
    }

    const scheduleCol = (j: Job): string => {
      const desc = j.schedule_description;

      return j.max_runs != null ? `${desc} (max ${j.max_runs})` : desc;
    };

    const escapeCell = (s: string): string => s.replace(/\|/g, '\\|');
    const header = '| ID | En | Name | Schedule | Next Run | Context |';
    const sep = '| --- | --- | --- | --- | --- | --- |';

    const rows = jobs.map(
      (j) =>
        `| ${escapeCell(String(j.id))} | ${j.enabled ? '✓' : '—'} | ${escapeCell(j.name)} | ${escapeCell(scheduleCol(j))} | ${escapeCell(formatNextRun(j.next_run_at))} | ${escapeCell(formatContextLine(j))} |`,
    );

    return `## Jobs\n\n${[header, sep, ...rows].join('\n')}`;
  }

  const idRaw = rest[0]?.trim();
  const id = idRaw ? parseInt(idRaw, 10) : NaN;
  const idValid = !Number.isNaN(id);

  // -------------------------------------------------------------------------
  // show
  // -------------------------------------------------------------------------
  if (sub === 'show') {
    if (!idRaw) {
      return `Usage: ${cmd} show <id>`;
    }

    if (!idValid) {
      return `Usage: ${cmd} show <id> (id must be a number)`;
    }

    const job = getJob(pluginDb, id);

    if (!job) {
      return `Job not found: ${id}`;
    }

    const scheduleLine =
      job.execution_type === 'cron'
        ? `Schedule: ${job.schedule}${job.max_runs != null ? ` (max ${job.max_runs} runs)` : ''}`
        : `Run at: ${job.run_at != null ? formatNextRun(job.run_at) : '—'} (once)`;

    const scheduleDescLine = `When: ${job.schedule_description}`;

    const lines = [
      `ID: ${job.id}`,
      `Name: ${job.name}`,
      `Type: ${job.execution_type}`,
      scheduleLine,
      scheduleDescLine,
      `Prompt: ${job.prompt.slice(0, 80)}${job.prompt.length > 80 ? '…' : ''}`,
      `Enabled: ${job.enabled ? 'yes' : 'no'}`,
      `Next run: ${formatNextRun(job.next_run_at)}`,
      `Backend: ${job.backend}`,
      `Provider: ${job.provider}`,
      `Model: ${job.model || '(default)'}`,
      `Mode: ${job.mode}`,
      `Budget: ${job.budget_sats != null ? `${job.budget_sats} sats (auto-flow)` : '—'}`,
      `Instructions: ${job.instructions != null ? job.instructions.slice(0, 120) + (job.instructions.length > 120 ? '…' : '') : '—'}`,
    ];

    return lines.join('\n');
  }

  // -------------------------------------------------------------------------
  // enable / disable / delete / history / run
  // -------------------------------------------------------------------------
  if (sub === 'enable') {
    if (!idValid) {
      return `Usage: ${cmd} enable <id>`;
    }

    if (!getJob(pluginDb, id)) {
      return `Job not found: ${id}`;
    }

    if (enableJob(pluginDb, id)) {
      const job = getJob(pluginDb, id);

      return `Job ${id} enabled. Next run: ${formatNextRun(job?.next_run_at ?? null)}`;
    }

    return `Job ${id} is already enabled or schedule invalid.`;
  }

  if (sub === 'disable') {
    if (!idValid) {
      return `Usage: ${cmd} disable <id>`;
    }

    if (disableJob(pluginDb, id)) {
      return `Job ${id} disabled.`;
    }

    return `Job not found or already disabled: ${id}`;
  }

  if (sub === 'delete') {
    if (!idValid) {
      return `Usage: ${cmd} delete <id>`;
    }

    if (deleteJob(pluginDb, id)) {
      return `Job ${id} deleted.`;
    }

    return `Job not found: ${id}`;
  }

  if (sub === 'history') {
    if (!idValid) {
      return `Usage: ${cmd} history <id> [N]`;
    }

    const job = getJob(pluginDb, id);

    if (!job) {
      return `Job not found: ${id}`;
    }

    const n = Math.min(50, Math.max(1, parseInt(rest[1] ?? '10', 10) || 10));
    const runs = listJobRuns(pluginDb, id, n);

    if (runs.length === 0) {
      return `No runs yet for "${job.name}".`;
    }

    const lines = runs.map((r) => {
      const start = new Date(r.started_at).toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      const duration =
        r.finished_at != null ? `${Math.round((r.finished_at - r.started_at) / 1000)}s` : '—';

      const err = r.error ? `: ${r.error.slice(0, 40)}…` : '';

      return `#${r.id} ${start} — ${r.status} (${duration})${err}`;
    });

    return `History for "${job.name}" (last ${n}):\n${lines.join('\n')}`;
  }

  if (sub === 'run') {
    if (!idValid) {
      return `Usage: ${cmd} run <id>`;
    }

    const job = getJob(pluginDb, id);

    if (!job) {
      return `Job not found: ${id}`;
    }

    try {
      await runJob({ job, pluginDb, ctx });

      return `Job ${id} (${job.name}) run completed. Result stored in job history (!${alias} history ${id}).`;
    } catch (err) {
      return `Run failed: ${String(err)}`;
    }
  }

  return `Unknown subcommand: ${sub}. Use ${cmd} help.`;
}
