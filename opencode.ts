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
import { createJobDraftsTable, storeDraft } from './drafts';
import { JobDraftInputSchema } from './types';

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

const createArgs = {
  input: tool.schema
    .record(tool.schema.string(), tool.schema.unknown())
    .describe('Full job draft input object (will be validated).'),
  original_prompt: tool.schema
    .string()
    .describe('Original natural language request, verbatim'),
};

const updateArgs = {
  id: tool.schema.number().int().positive().describe('ID of the job to update'),
  input: tool.schema
    .record(tool.schema.string(), tool.schema.unknown())
    .describe('Full updated job input object (will be validated).'),
  original_prompt: tool.schema
    .string()
    .describe('Original natural language request, verbatim'),
};

const deleteArgs = {
  id: tool.schema.number().int().positive().describe('ID of the job to delete'),
  original_prompt: tool.schema
    .string()
    .describe('Original natural language request, verbatim'),
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

type CreateArgs = {
  input: Record<string, unknown>;
  original_prompt: string;
};

type UpdateArgs = {
  id: number;
  input: Record<string, unknown>;
  original_prompt: string;
};

type DeleteArgs = {
  id: number;
  original_prompt: string;
};

// ---------------------------------------------------------------------------
// Agent instructions — injected into AGENTS.md by the generator
// ---------------------------------------------------------------------------

export function agentInstructions(alias: string): string {
  return `## Job Management (${alias} tools)

When the user asks to list, inspect, create, update, or delete jobs:
- Use the ${alias}__list tool to get the current set of jobs and their IDs
- Use the ${alias}__show tool to inspect details for a specific job by ID
- Never guess job IDs — always resolve them via the list tool first
- For create/update/delete: always use the ${alias}__create / ${alias}__update / ${alias}__delete tools (they create drafts)
- For reminder-style requests ("remind me X in Y minutes/hours", "remind me tomorrow at 9am"), always use ${alias}__create and treat it as creating a one-time job (execution_type: "one-time") with an appropriate run_at
- Always show the full tool output exactly as returned, including Draft ID and reply instructions
- The user must explicitly confirm or discard drafts via the reply commands shown in the tool output`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createToolDefinitions(alias: string) {
  const dbPath = join(dmBotRoot, 'plugins', alias, 'db.sqlite');
  const cmd = `!${alias}`;

  function openDb(): Database {
    const db = new Database(dbPath);
    db.run('PRAGMA foreign_keys = ON');
    createJobTables(db);
    createJobDraftsTable(db);

    return db;
  }

  function formatDraftReply(
    draftId: number,
    kind: 'create' | 'update' | 'delete',
  ): string {
    if (kind === 'create') {
      return `Reply: ${cmd} confirm ${draftId} | ${cmd} revise ${draftId} <corrections> | ${cmd} discard ${draftId}`;
    }

    return `Reply: ${cmd} discard ${draftId} (confirm for ${kind} drafts is not implemented yet)`;
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

        const formatContextLine = (
          job: ReturnType<typeof listJobs>[number],
        ): string => {
          const modelPart = job.model ? job.model : '—';

          return [job.backend, job.provider, modelPart, job.mode].join(' / ');
        };

        const scheduleCol = (
          j: ReturnType<typeof listJobs>[number],
        ): string => {
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
              ? job.instructions.slice(0, 120) +
                (job.instructions.length > 120 ? '…' : '')
              : '—'
          }`,
        ];

        return lines.join('\n');
      },
    },

    {
      name: 'create',
      description:
        'Propose creating a new job. IMPORTANT: This tool only creates a draft for review; it does not create a job immediately. Show the full tool output (Draft ID + reply instructions) to the user exactly as returned.',
      args: createArgs,
      execute: async (args: CreateArgs): Promise<string> => {
        const db = openDb();
        const parsed = JobDraftInputSchema.safeParse(args.input);

        if (!parsed.success) {
          return `Validation error: ${parsed.error.message}`;
        }

        const draftId = storeDraft(db, {
          kind: 'create',
          input: parsed.data,
          originalPrompt: args.original_prompt,
        });

        return [
          `I'm going to create a job named "${parsed.data.name}" (${parsed.data.schedule_description}).`,
          '',
          `Draft ID: ${draftId}`,
          formatDraftReply(draftId, 'create'),
        ].join('\n');
      },
    },

    {
      name: 'update',
      description:
        'Propose updating an existing job. IMPORTANT: This tool only creates a draft for review; it does not update a job immediately. Show the full tool output (Draft ID + reply instructions) to the user exactly as returned.',
      args: updateArgs,
      execute: async (args: UpdateArgs): Promise<string> => {
        const db = openDb();
        const existing = getJob(db, args.id);

        if (!existing) {
          return `Job not found: ${args.id}. Call ${alias}__list first to see valid job IDs.`;
        }

        const parsed = JobDraftInputSchema.safeParse(args.input);

        if (!parsed.success) {
          return `Validation error: ${parsed.error.message}`;
        }

        const draftId = storeDraft(db, {
          kind: 'update',
          input: { id: args.id, ...parsed.data },
          originalPrompt: args.original_prompt,
        });

        return [
          `I'm going to update Job #${existing.id}: "${existing.name}"`,
          '',
          `Draft ID: ${draftId}`,
          formatDraftReply(draftId, 'update'),
        ].join('\n');
      },
    },

    {
      name: 'delete',
      description:
        'Propose deleting a job. IMPORTANT: This tool only creates a draft for review; it does not delete a job immediately. Show the full tool output (Draft ID + reply instructions) to the user exactly as returned.',
      args: deleteArgs,
      execute: async (args: DeleteArgs): Promise<string> => {
        const db = openDb();
        const existing = getJob(db, args.id);

        if (!existing) {
          return `Job not found: ${args.id}. Call ${alias}__list first to see valid job IDs.`;
        }

        const draftId = storeDraft(db, {
          kind: 'delete',
          input: { id: args.id },
          originalPrompt: args.original_prompt,
        });

        return [
          `I'm going to delete Job #${existing.id}: "${existing.name}".`,
          '',
          `Draft ID: ${draftId}`,
          formatDraftReply(draftId, 'delete'),
        ].join('\n');
      },
    },
  ] as const;
}

export type ToolDefinitions = ReturnType<typeof createToolDefinitions>;
export type ToolDefinition = ToolDefinitions[number];
