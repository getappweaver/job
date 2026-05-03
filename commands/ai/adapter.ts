import type { JobCommandAdapterParams } from '../../types';

import { handleAiCommand } from './handler';

function toPromptTokens(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [String(value)];
}

export async function adaptAiCommand(
  params: JobCommandAdapterParams,
): Promise<string> {
  const promptTokens = toPromptTokens(params.parsed.arguments.prompt);

  const text = await handleAiCommand({
    prefix: params.prefix,
    alias: params.alias,
    source: params.source,
    db: params.db,
    ctx: params.ctx,
    identity: params.identity,
    promptTokens,
  });

  return text;
}
