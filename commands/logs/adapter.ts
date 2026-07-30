import type { WebNodeRoot } from '@src/web/ui-schema';

import type { JobCommandAdapterParams } from '../../types';

import { handleLogsCommand, resolveLogsCommand } from './handler';
import { renderLogsWeb } from './renderers/web';

export function adaptLogsCommand(
  params: JobCommandAdapterParams,
): string | WebNodeRoot {
  const rawId = params.parsed.arguments.id;
  const rawRunId = params.parsed.arguments.run_id;
  const idRaw = rawId === undefined || rawId === null ? null : String(rawId);

  const runIdRaw =
    rawRunId === undefined || rawRunId === null ? null : String(rawRunId);

  if (params.source === 'web') {
    const result = resolveLogsCommand({
      prefix: params.prefix,
      alias: params.alias,
      db: params.db,
      idRaw,
      runIdRaw,
    });

    return result.ok
      ? renderLogsWeb({
          alias: params.alias,
          job: result.job,
          logs: result.logs,
          runId: result.runId,
        })
      : result.message;
  }

  return handleLogsCommand({
    prefix: params.prefix,
    alias: params.alias,
    db: params.db,
    ctx: params.ctx,
    identity: params.identity,
    idRaw,
    runIdRaw,
  });
}
