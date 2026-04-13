// ---------------------------------------------------------------------------
// plugins/job/commands/ai/generate.ts — parse model JSON into JobDraftInput
// ---------------------------------------------------------------------------

import { getOutputString } from '@src/backends/types';
import type { PluginDefaults, RunAgentFn } from '@src/core/plugin';

import type { JobDraftInput } from '../../types';
import { JobDraftInputSchema, JobDraftPromptInputSchema } from '../../types';

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
