import {
  buildJobCreationRulesSection,
  buildJobInstructionsFieldRulesSection,
  buildJobPayloadFieldRulesSection,
} from './job-creation-rules';

export function agentInstructions(alias: string): string {
  return `## Job (${alias} tools)

Use \`list\`, \`show\`, and \`context\` for read-only inspection.
Use \`context\` before creating or revising jobs with relative or wall-clock time; it returns the current UTC time, local time, and user's timezone.
Use \`create\` to propose a new job draft.

When turning a natural-language request into a new job draft:
- If the request involves timing, first call \`context\`; use its UTC/local timezone values for relative phrases like \`in 10 minutes\`, \`tomorrow\`, or \`next Monday\`.
${buildJobCreationRulesSection()}

How to fill the job payload fields:
${buildJobPayloadFieldRulesSection()}

How to fill the optional \`instructions\` field:
${buildJobInstructionsFieldRulesSection()}

If the user is revising a draft/job:
- Preserve the existing shape unless the correction requires changing execution type or timing.
- Apply time corrections relative to the current request context.

For mutating calls, include \`original_prompt\` at the top level with the user request verbatim.

\`create\` returns a draft for review. Do not treat draft creation as final application; the draft will be surfaced to the user automatically for accept/revise/discard flow.
`;
}
