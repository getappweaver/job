import { buildHelpSubcommandRepresentation } from '@src/commands/help/command';
import { renderHelpText } from '@src/commands/help/renderers/text';

import type { JobCommandAdapterParams } from '../../types';

export function adaptHelpCommand(params: JobCommandAdapterParams): string {
  void params.db;
  void params.ctx;
  void params.identity;

  const result = buildHelpSubcommandRepresentation({
    prefix: params.prefix,
    alias: params.alias,
    command: params.command,
    parsed: params.parsed,
  });

  if (result.type === 'error') {
    return result.message;
  }

  return renderHelpText(result.representation, { prefix: params.prefix });
}
