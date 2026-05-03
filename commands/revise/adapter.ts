import type { JobCommandAdapterParams } from '../../types';

import { handleReviseCommand } from './handler';

function toCorrectionText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join(' ');
  }

  if (value === undefined || value === null) {
    return '';
  }

  return String(value);
}

export async function adaptReviseCommand(
  params: JobCommandAdapterParams,
): Promise<string> {
  const rawId = params.parsed.arguments.draftId;

  const draftIdRaw =
    rawId === undefined || rawId === null ? null : String(rawId);

  const corrections = toCorrectionText(params.parsed.arguments.corrections);

  const text = await handleReviseCommand({
    prefix: params.prefix,
    alias: params.alias,
    db: params.db,
    ctx: params.ctx,
    identity: params.identity,
    draftIdRaw,
    corrections,
  });

  return text;
}
