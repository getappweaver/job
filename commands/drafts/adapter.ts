import type { JobCommandAdapterParams } from '../../types';

import { handleDraftsCommand } from './handler';

export function adaptDraftsCommand(params: JobCommandAdapterParams): string {
  const text = handleDraftsCommand({
    prefix: params.prefix,
    alias: params.alias,
    db: params.db,
    ctx: params.ctx,
    identity: params.identity,
  });

  return text;
}
