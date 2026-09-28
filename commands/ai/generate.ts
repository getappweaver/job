// ---------------------------------------------------------------------------
// plugins/job/commands/ai/generate.ts — parse model JSON into JobDraftInput
// ---------------------------------------------------------------------------

import { getOutputString } from '@src/backends/types';
import type { PluginAgentService } from '@src/core/plugin';

import type { JobDraftInput } from '../../types';
import { JobDraftInputSchema, JobDraftPromptInputSchema } from '../../types';

export type GenerateCreateWithParamsProps = {
  systemPrompt: string;
  agent: PluginAgentService;
};

export async function generateCreateWithParams({
  systemPrompt,
  agent,
}: GenerateCreateWithParamsProps): Promise<JobDraftInput> {
  const result = await agent.run({
    prompt: systemPrompt,
    sessionId: null,
    workspaceTarget: null,
    cwd: null,
    onAgentStreamChunk: null,
    abortSignal: null,
    context: null,
  });

  if (result.type === 'error') {
    throw new Error(result.output);
  }

  const raw = getOutputString(result).trim();

  if (!raw || raw === '(no output)') {
    throw new Error(
      'Model returned no text. Try again with a different model.',
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
    backend: 'opencode',
    provider: 'local',
    model: '',
    model_configured: false,
    model_source_id: null,
    workspace_target: null,
    sticky_session: false,
  };

  return JobDraftInputSchema.parse(fullInput);
}
