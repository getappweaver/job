// ---------------------------------------------------------------------------
// plugins/job/opencode.ts — OpenCode tool definitions for the job plugin
//
// Usage: createToolDefinitions(alias) returns the tool definitions array.
// The alias is injected by the code generator reading plugins.json.
//
// Args use tool.schema (OpenCode's Zod v3) — our own Zod v4 is only used
// inside execute bodies for runtime validation.
// ---------------------------------------------------------------------------

import { join } from 'path';

import { tool } from '@opencode-ai/plugin';
import { Database } from 'bun:sqlite';

import { dmBotRoot } from '../../src/paths';

import { createJobTables, getJob, listJobs } from './db';
import { createJobDraftsTable } from './drafts';

// ---------------------------------------------------------------------------
// Arg shapes — tool.schema (OpenCode's Zod v3)
// ---------------------------------------------------------------------------

const listArgs = {
  enabled: tool.schema
    .boolean()
    .optional()
    .describe('If true, only list enabled jobs. Default: false (all jobs).'),
};

const showArgs = {
  id: tool.schema.number().int().positive().describe('ID of the job to show'),
};

// ---------------------------------------------------------------------------
// Arg types (manual — can't infer from tool.schema)
// ---------------------------------------------------------------------------

type ListArgs = {
  enabled?: boolean;
};

type ShowArgs = {
  id: number;
};

// ---------------------------------------------------------------------------
// Agent instructions — injected into AGENTS.md by the generator
// ---------------------------------------------------------------------------

export function agentInstructions(alias: string): string {
  return `## Job Management (${alias} tools)

When the user asks to list, inspect, or reason about scheduled jobs:
- Use the ${alias}__list tool to get the current set of jobs and their IDs
- Use the ${alias}__show tool to inspect details for a specific job by ID
- Never guess job IDs — always resolve them via the list tool first
- Treat plugin jobs as read-only for now; creation and mutation happen via the bot commands (!${alias} ai, !${alias} confirm, etc.) and their draft/confirm flow.`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createToolDefinitions(alias: string) {
  const dbPath = join(dmBotRoot, 'plugins', alias, 'db.sqlite');

  function openDb(): Database {
    const db = new Database(dbPath);
    db.run('PRAGMA foreign_keys = ON');
    createJobTables(db);
    createJobDraftsTable(db);

    return db;
  }

  return [
    {
      name: 'list',
      description:
        'List all jobs with their IDs, enabled status, schedule, next_run, and context. Always call this first before using a job ID in other tools.',
      args: listArgs,
      execute: async (args: ListArgs): Promise<string> => {
        const db = openDb();
        let jobs = listJobs(db);

        if (args.enabled) {
          jobs = jobs.filter((j) => j.enabled);
        }

        if (jobs.length === 0) {
          return 'No jobs.';
        }

        const formatNextRun = (nextRunAt: number | null): string => {
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
        };

        const formatContextLine = (job: ReturnType<typeof listJobs>[number]): string => {
          const modelPart = job.model ? job.model : '—';

          return [job.backend, job.provider, modelPart, job.mode].join(' / ');
        };

        const scheduleCol = (j: ReturnType<typeof listJobs>[number]): string => {
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

        return ['## Jobs', '', header, sep, ...rows].join('\n');
      },
    },

    {
      name: 'show',
      description:
        'Show full details for a job by ID, including schedule, next_run, backend/provider/model/mode, budget, and instructions.',
      args: showArgs,
      execute: async (args: ShowArgs): Promise<string> => {
        const db = openDb();
        const job = getJob(db, args.id);

        if (!job) {
          return `Job not found: ${args.id}. Call the ${alias}__list tool first to see valid IDs.`;
        }

        const formatNextRun = (nextRunAt: number | null): string => {
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
        };

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
          `Instructions: ${
            job.instructions != null
              ? job.instructions.slice(0, 120) + (job.instructions.length > 120 ? '…' : '')
              : '—'
          }`,
        ];

        return lines.join('\n');
      },
    },
  ] as const;
}

export type ToolDefinitions = ReturnType<typeof createToolDefinitions>;
export type ToolDefinition = ToolDefinitions[number];
