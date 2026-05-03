import type { JobCommandAdapterParams } from '../../types';

import { handleRunCommand } from './handler';

export async function adaptRunCommand(
  params: JobCommandAdapterParams,
): Promise<string> {
  const raw = params.parsed.arguments.id;

  const idRaw = raw === undefined || raw === null ? null : String(raw);

  const text = await handleRunCommand({
    prefix: params.prefix,
    alias: params.alias,
    db: params.db,
    ctx: params.ctx,
    identity: params.identity,
    idRaw,
  });

  return text;
}
