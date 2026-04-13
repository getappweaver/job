// ---------------------------------------------------------------------------
// plugins/job/commands/ai/prompts.ts — system prompts for create / revise
// ---------------------------------------------------------------------------

import { z } from 'zod';

import { type JobDraftInput, JobDraftPromptInputSchema } from '../../types';

const CREATE_JOB_JSON_SCHEMA = JSON.stringify(
  z.toJSONSchema(JobDraftPromptInputSchema),
  null,
  2,
);

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

export function buildJobCreateSystemPrompt(userPrompt: string): string {
  const tc = getCurrentTimeContext();

  return `You are creating a scheduled AI agent job from a natural-language request.

User request: "${userPrompt}"

Current date and time (UTC): ${tc.nowUtc}
Current date and time (user's timezone): ${tc.nowLocal}
User's timezone: ${tc.timeZone}
Use the current date/time above as the reference for relative times ("in 10 minutes", "tomorrow at 9am"). For one-time jobs, output run_at as an ISO 8601 date-time string in UTC (the instant in UTC, as a string; must be in the future). Interpret wall-clock times (e.g. "9am") in the user's timezone.

Important: Do NOT include backend/provider/model/mode/workspace_target in the JSON output. Those are set by the system.
Important: The job prompt should be written for execution time, not for job creation time. When the job runs later, the agent should be able to act immediately from the stored prompt without asking to schedule or confirm the reminder again.

Output ONLY a single JSON object (no markdown, no code fence). You must choose exactly one of:

A) Recurring (cron): include execution_type: "cron", schedule (cron expression), schedule_description, and optionally maxRuns (number | null).
   schedule: valid 5-field cron, e.g. "0 7 * * *" (daily 07:00), "0 8 * * 1" (Mondays 08:00), "*/30 * * * *" (every 30 min).
   schedule_description: a short human-readable description of when it runs (e.g. "every Monday morning at 9am", "daily at 7am", "every 30 minutes"). Always include this.
   maxRuns: limit how many times it runs; infer from context (e.g. "every hour for the rest of the day", "three times a day for a week"). Use null if no limit.
   prompt: write the message/task to execute when the schedule triggers. Example: prefer "Send me a reminder that I have a doctor appointment at 1 PM today." over "Remind me that I have a doctor appointment at 1 PM."
   instructions: when helpful, add concise execution guidance such as "Deliver the reminder directly and do not ask follow-up questions." Use null when no extra guidance is needed.

B) One-time: include execution_type: "one-time", run_at (ISO 8601 date-time string in UTC), and schedule_description (human-readable description of run_at).
   run_at: the instant in UTC as an ISO 8601 string (must be in the future). Compute from current date/time above; e.g. "in 10 minutes" = now + 10 min in UTC, "tomorrow at 9am" = 9am in user's timezone converted to UTC.
   schedule_description: human-readable description of when it runs / of run_at (e.g. "tomorrow at 9am", "in 10 minutes"). Always include this.
   prompt: write the final thing to do at run time, not a request to schedule something.
   instructions: for reminders and similar jobs, prefer concise guidance like "Deliver the reminder immediately and do not ask scheduling questions." Use null when no extra guidance is needed.

Expected JSON structure (must match this schema):
\`\`\`json
${CREATE_JOB_JSON_SCHEMA}
\`\`\``;
}

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
