import type { Database } from 'bun:sqlite';

import type { PluginContext, PluginIdentity } from '@src/core/plugin';
import type { CommandDefinition } from '@src/system/command-definition';
import type { ParsedCliInvocation } from '@src/system/parser-cli';

import { jobReplyMessage } from '../adapter-util';

import { handleHistoryCommand } from './handler';

export function adaptHistoryCommand(params: {
  prefix: string;
  alias: string;
  parsed: ParsedCliInvocation;
  command: CommandDefinition;
  db: Database;
  ctx: PluginContext;
  identity: PluginIdentity;
}) {
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

  return jobReplyMessage({
    alias: params.alias,
    subcommand: 'history',
    text,
  });
}
