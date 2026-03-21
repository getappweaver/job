// ---------------------------------------------------------------------------
// plugins/job/ai.ts — !job ai <prompt> and shared prompt/format helpers
// ---------------------------------------------------------------------------
import type { Database } from 'bun:sqlite';
import { z } from 'zod';

import { getOutputString } from '@src/backends/types';
import type {
  PluginContext,
  PluginDefaults,
  PluginIdentity,
  RunAgentFn,
} from '@src/core/plugin';
import {
  getAgentBackend,
  getCurrentOrDefaultMode,
  getModelOverride,
  getProviderName,
  getWorkspaceTarget,
  openCoreDb,
} from '@src/db';

import { getJob, listJobs } from './db';
import { storeDraft } from './drafts';
import type { JobDraftInput } from './types';
import { JobDraftInputSchema, JobDraftPromptInputSchema } from './types';

const JobListCallSchema = z.object({
  type: z.literal('list'),
});

const JobShowCallSchema = z.object({
  type: z.literal('show'),
  input: z.object({
    id: z.number().int().positive(),
  }),
});

const JobCreateCallSchema = z.object({
  type: z.literal('create'),
  input: JobDraftPromptInputSchema,
  original_prompt: z.string(),
});

const JobToolCallSchema = z.discriminatedUnion('type', [
  JobListCallSchema,
  JobShowCallSchema,
  JobCreateCallSchema,
]);

type JobToolCall = z.infer<typeof JobToolCallSchema>;

export { JobToolCallSchema as ToolCallSchema };
export const skillDescription = 'Job scheduling via local dm-bot CLI tools.';

// ---------------------------------------------------------------------------
// Time context for prompts
// ---------------------------------------------------------------------------

export function getCurrentTimeContext(): {
  nowUtc: string;
  timeZone: string;
  nowLocal: string;
} {
  const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const nowLocal = now.toLocaleString(undefined, { timeZone });

  return {
    nowUtc: now.toISOString(),
    timeZone,
    nowLocal: `${nowLocal} (${timeZone})`,
  };
}

// ---------------------------------------------------------------------------
// JSON schema for prompt-only draft input (used in prompts)
// ---------------------------------------------------------------------------

const CREATE_JOB_JSON_SCHEMA = JSON.stringify(
  z.toJSONSchema(JobDraftPromptInputSchema),
  null,
  2,
);

// ---------------------------------------------------------------------------
// System prompt for creating a job from natural language
// ---------------------------------------------------------------------------

export function buildJobCreateSystemPrompt(userPrompt: string): string {
  const tc = getCurrentTimeContext();

  return `You are creating a scheduled AI agent job from a natural-language request.

User request: "${userPrompt}"

Current date and time (UTC): ${tc.nowUtc}
Current date and time (user's timezone): ${tc.nowLocal}
User's timezone: ${tc.timeZone}
Use the current date/time above as the reference for relative times ("in 10 minutes", "tomorrow at 9am"). For one-time jobs, output run_at as an ISO 8601 date-time string in UTC (the instant in UTC, as a string; must be in the future). Interpret wall-clock times (e.g. "9am") in the user's timezone.

Important: Do NOT include backend/provider/model/mode/workspace_target in the JSON output. Those are set by the system.

Output ONLY a single JSON object (no markdown, no code fence). You must choose exactly one of:

A) Recurring (cron): include execution_type: "cron", schedule (cron expression), schedule_description, and optionally maxRuns (number | null).
   schedule: valid 5-field cron, e.g. "0 7 * * *" (daily 07:00), "0 8 * * 1" (Mondays 08:00), "*/30 * * * *" (every 30 min).
   schedule_description: a short human-readable description of when it runs (e.g. "every Monday morning at 9am", "daily at 7am", "every 30 minutes"). Always include this.
   maxRuns: limit how many times it runs; infer from context (e.g. "every hour for the rest of the day", "three times a day for a week"). Use null if no limit.

B) One-time: include execution_type: "one-time", run_at (ISO 8601 date-time string in UTC), and schedule_description (human-readable description of run_at).
   run_at: the instant in UTC as an ISO 8601 string (must be in the future). Compute from current date/time above; e.g. "in 10 minutes" = now + 10 min in UTC, "tomorrow at 9am" = 9am in user's timezone converted to UTC.
   schedule_description: human-readable description of when it runs / of run_at (e.g. "tomorrow at 9am", "in 10 minutes"). Always include this.

Expected JSON structure (must match this schema):
\`\`\`json
${CREATE_JOB_JSON_SCHEMA}
\`\`\``;
}

// ---------------------------------------------------------------------------
// Revise prompt (for !job revise)
// ---------------------------------------------------------------------------

type ReviseEntry = {
  input: JobDraftInput;
  originalPrompt: string;
};

export function buildRevisePrompt(
  entry: ReviseEntry,
  corrections: string,
): string {
  const tc = getCurrentTimeContext();

  return `You are revising a scheduled job configuration.

Original user request: "${entry.originalPrompt}"
New correction: ${corrections}

Current date and time (UTC): ${tc.nowUtc}
User's timezone: ${tc.timeZone}
Use this when the correction involves time (e.g. "30 minutes later", "tomorrow at 5pm").

Current parameters (JSON): ${JSON.stringify(entry.input)}

Output ONLY a single JSON object matching this schema. Apply the user's correction. No markdown, no code fence.

Schema:
\`\`\`json
${CREATE_JOB_JSON_SCHEMA}
\`\`\``;
}

// ---------------------------------------------------------------------------
// Format draft preview (create / revise)
// ---------------------------------------------------------------------------

export function formatCreateWithPreview(
  id: string,
  input: JobDraftInput,
): string {
  const w = 19;

  const common = [
    `${'name'.padEnd(w)} : ${input.name}`,
    `${'prompt'.padEnd(w)} : ${input.prompt}`,
    `${'schedule_description'.padEnd(w)} : ${input.schedule_description}`,
    `${'backend'.padEnd(w)} : ${input.backend}`,
    `${'provider'.padEnd(w)} : ${input.provider}`,
    `${'model'.padEnd(w)} : ${input.model}`,
    `${'mode'.padEnd(w)} : ${input.mode}`,
    `${'budget_sats'.padEnd(w)} : ${input.budget_sats ?? '—'}`,
    `${'instructions'.padEnd(w)} : ${input.instructions ?? '—'}`,
  ];

  const execution =
    input.execution_type === 'cron'
      ? [
          `execution_type: cron`,
          `schedule    : ${input.schedule}`,
          `maxRuns     : ${input.maxRuns ?? '—'}`,
        ]
      : [`execution_type: one-time`, `run_at      : ${input.run_at}`];

  const lines = [...execution, ...common];

  return `${lines.join('\n')}

Draft ID: ${id}
Reply: !job confirm ${id} | !job revise ${id} <corrections> | !job discard ${id}`;
}

// ---------------------------------------------------------------------------
// Generate CreateJobInput from model output (uses runAgent)
// ---------------------------------------------------------------------------

export type GenerateCreateWithParamsProps = {
  systemPrompt: string;
  runAgent: RunAgentFn | null;
  defaults: PluginDefaults;
};

export async function generateCreateWithParams({
  systemPrompt,
  runAgent,
  defaults,
}: GenerateCreateWithParamsProps): Promise<JobDraftInput> {
  if (!runAgent) {
    throw new Error('runAgent is not set');
  }

  const result = await runAgent(systemPrompt);

  if (result.type === 'error') {
    throw new Error(result.output);
  }

  const raw = getOutputString(result).trim();

  if (!raw || raw === '(no output)') {
    throw new Error(
      'Model returned no text. Try again or use a different backend (e.g. cursor).',
    );
  }

  const stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let jsonStr = stripped;
  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = stripped.slice(firstBrace, lastBrace + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      `Model response was not valid JSON. Raw output (first 200 chars): ${raw.slice(0, 200)}`,
    );
  }

  const promptInput = JobDraftPromptInputSchema.parse(parsed);

  const fullInput = {
    ...promptInput,
    ...defaults,
  };

  return JobDraftInputSchema.parse(fullInput);
}

// ---------------------------------------------------------------------------
// handleJobAi — mirror of plugins/todo/ai.ts handleTodoAi shape
// ---------------------------------------------------------------------------

export type HandleJobAiProps = {
  args: string[];
  identity: PluginIdentity;
  pluginDb: Database;
  ctx: PluginContext;
};

export async function handleJobAi({
  args,
  identity,
  pluginDb,
  ctx,
}: HandleJobAiProps): Promise<string> {
  const userPrompt = args.join(' ').trim();
  const alias = identity.alias;

  if (!userPrompt) {
    return `Usage: !${alias} ai <natural language request>\nExample: !${alias} ai send me a morning brief every day at 8am`;
  }

  const systemPrompt = buildJobCreateSystemPrompt(userPrompt);

  let draftInput: JobDraftInput;

  try {
    draftInput = await generateCreateWithParams({
      systemPrompt,
      runAgent: ctx.runAgent,
      defaults: ctx.defaults,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    return `Failed to generate or validate job parameters: ${msg}`;
  }

  const draftId = storeDraft(pluginDb, {
    kind: 'create',
    input: draftInput,
    originalPrompt: userPrompt,
  });

  return formatCreateWithPreview(String(draftId), draftInput);
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

function formatContextLine(props: {
  backend: string;
  provider: string;
  model: string;
  mode: string;
}): string {
  const { backend, provider, model, mode } = props;

  return [backend, provider, model || '—', mode].join(' / ');
}

type ScheduleColProps = {
  executionType: 'cron' | 'one-time';
  scheduleDescription: string;
  maxRuns: number | null;
};

function scheduleCol({
  executionType,
  scheduleDescription,
  maxRuns,
}: ScheduleColProps): string {
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

  const rows = jobs.map((job) => {
    return `| ${escapeCell(String(job.id))} | ${job.enabled ? '✓' : '—'} | ${escapeCell(job.name)} | ${escapeCell(scheduleCol({ executionType: job.execution_type, scheduleDescription: job.schedule_description, maxRuns: job.max_runs ?? null }))} | ${escapeCell(formatNextRun(job.next_run_at))} | ${escapeCell(formatContextLine({ backend: job.backend, provider: job.provider, model: job.model, mode: job.mode }))} |`;
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
      : `Run at: ${job.run_at != null ? formatNextRun(job.run_at) : '—'} (once)`;

  const lines = [
    `ID: ${job.id}`,
    `Name: ${job.name}`,
    `Type: ${job.execution_type}`,
    scheduleLine,
    `When: ${job.schedule_description}`,
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

export function agentInstructions(alias: string): string {
  return `## Job (${alias} tools)

Use \`list\` and \`show\` for read-only inspection.
Use \`create\` to propose a new job draft.

For mutating calls, include \`original_prompt\` at the top level with the user request verbatim.

After create returns a draft, apply it with:
- \`!${alias} confirm <draft_id>\`
- \`!${alias} revise <draft_id> <corrections>\`
- \`!${alias} discard <draft_id>\`
`;
}

export async function executeTool({
  alias: _alias,
  call,
  db,
}: {
  alias: string;
  call: JobToolCall;
  db: Database;
}): Promise<string> {
  switch (call.type) {
    case 'list':
      return formatJobSummaryList(db);
    case 'show':
      return formatJobDetail(db, call.input.id);
    case 'create': {
      const coreDb = openCoreDb();

      try {
        const backendName = getAgentBackend(coreDb);

        const defaults: PluginDefaults = {
          backend: backendName,
          provider: getProviderName(coreDb),
          model: getModelOverride(coreDb, backendName),
          mode: getCurrentOrDefaultMode(coreDb),
          workspace_target: getWorkspaceTarget(coreDb),
        };

        const fullInput = JobDraftInputSchema.parse({
          ...call.input,
          ...defaults,
          model: defaults.model ?? '',
        });

        const draftId = storeDraft(db, {
          kind: 'create',
          input: fullInput,
          originalPrompt: call.original_prompt,
        });

        return formatCreateWithPreview(String(draftId), fullInput);
      } finally {
        coreDb.close();
      }
    }
  }
}

// Re-export so CLI can open the plugin DB without importing init/bot wiring.
export { openDb } from './db';
