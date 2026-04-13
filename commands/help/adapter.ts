import type { Database } from 'bun:sqlite';

import { buildHelpSubcommandRepresentation } from '@src/commands/help/command';
import type { PluginContext, PluginIdentity } from '@src/core/plugin';
import type { CommandDefinition } from '@src/system/command-definition';
import type { ParsedCliInvocation } from '@src/system/parser-cli';

import { createMessageRepresentation } from '../../output/message/builder';

export function adaptHelpCommand(params: {
  prefix: string;
  alias: string;
  parsed: ParsedCliInvocation;
  command: CommandDefinition;
  db: Database;
  ctx: PluginContext;
  identity: PluginIdentity;
}) {
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
    return createMessageRepresentation({
      command: params.alias,
      subcommand: 'help',
      tone: 'error',
      text: result.message,
    });
  }

  return result.representation;
}
