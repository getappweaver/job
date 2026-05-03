const JOB_CREATION_RULES = [
  'Use the current request/conversation time context for relative phrases like `in 10 minutes`, `tomorrow`, or `next Monday`.',
  "Interpret wall-clock times like `9am` in the user's timezone.",
  'Prefer a one-time job for requests like reminders at a specific time/date.',
  'Prefer a cron job for recurring requests like daily/weekly/every X.',
  'Always include a clear `schedule_description`.',
  'For one-time jobs, `run_at` must be an ISO 8601 UTC timestamp and must be in the future.',
  'For cron jobs, `schedule` must be a valid 5-field cron expression.',
  'Use `maxRuns: null` unless the user clearly asked for a limit.',
  'Use `budget_sats: null` unless the user clearly asked for a budget.',
  'Do NOT include backend/provider/model/mode/workspace_target in the create payload; those are system-managed.',
] as const;

const JOB_PAYLOAD_FIELD_RULES = [
  "The user's message is the scheduling request; the job's stored `prompt` is the runtime instruction that will be executed later.",
  'Write the stored `prompt` for execution time, not scheduling time.',
  'The stored `prompt` should let the agent act immediately when the job runs.',
  'Do not ask to schedule or confirm the reminder again inside the stored `prompt`.',
  'For reminder-style jobs, the stored `prompt` should usually be a direct instruction such as `Send me a reminder to check my emails.`',
] as const;

const JOB_INSTRUCTIONS_FIELD_RULES = [
  'Use `instructions` for extra execution guidance only.',
  'For reminders and similar jobs, a concise value like `Deliver the reminder immediately and do not ask scheduling questions.` is often appropriate.',
  'Use `instructions: null` when no extra execution guidance is needed.',
] as const;

function formatBullets(lines: readonly string[]): string {
  return lines.map((line) => `- ${line}`).join('\n');
}

export function buildJobCreationRulesSection(): string {
  return formatBullets(JOB_CREATION_RULES);
}

export function buildJobPayloadFieldRulesSection(): string {
  return formatBullets(JOB_PAYLOAD_FIELD_RULES);
}

export function buildJobInstructionsFieldRulesSection(): string {
  return formatBullets(JOB_INSTRUCTIONS_FIELD_RULES);
}
