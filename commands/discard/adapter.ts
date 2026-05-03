import type { JobCommandAdapterParams } from '../../types';

import { handleDiscardCommand } from './handler';

export function adaptDiscardCommand(params: JobCommandAdapterParams): string {
  const raw = params.parsed.arguments.draftId;

  const draftIdRaw = raw === undefined || raw === null ? null : String(raw);

  const text = handleDiscardCommand({
    prefix: params.prefix,
    alias: params.alias,
    db: params.db,
    ctx: params.ctx,
    identity: params.identity,
    draftIdRaw,
  });

  return text;
}
