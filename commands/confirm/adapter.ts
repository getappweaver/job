import type { JobCommandAdapterParams } from '../../types';

import { handleConfirmCommand } from './handler';

export function adaptConfirmCommand(params: JobCommandAdapterParams): string {
  const raw = params.parsed.arguments.draftId;

  const draftIdRaw = raw === undefined || raw === null ? null : String(raw);

  const text = handleConfirmCommand({
    prefix: params.prefix,
    alias: params.alias,
    db: params.db,
    ctx: params.ctx,
    identity: params.identity,
    draftIdRaw,
  });

  return text;
}
