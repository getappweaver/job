import type { JobCommandAdapterParams } from '../../types';

import { handleHistoryCommand } from './handler';

export function adaptHistoryCommand(params: JobCommandAdapterParams): string {
  const rawId = params.parsed.arguments.id;

  const idRaw = rawId === undefined || rawId === null ? null : String(rawId);

  const rawLimit = params.parsed.arguments.limit;

  const limitRaw =
    rawLimit === undefined || rawLimit === null ? null : String(rawLimit);

  const text = handleHistoryCommand({
    prefix: params.prefix,
    alias: params.alias,
    db: params.db,
    ctx: params.ctx,
    identity: params.identity,
    idRaw,
    limitRaw,
  });

  return text;
}
