import type { JobCommandAdapterParams } from '../../types';

import { handleShowCommand } from './handler';

export function adaptShowCommand(params: JobCommandAdapterParams): string {
  const raw = params.parsed.arguments.id;

  const idRaw = raw === undefined || raw === null ? null : String(raw);

  const text = handleShowCommand({
    prefix: params.prefix,
    alias: params.alias,
    db: params.db,
    ctx: params.ctx,
    identity: params.identity,
    idRaw,
  });

  return text;
}
