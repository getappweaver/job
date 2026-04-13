import type { Database } from 'bun:sqlite';

import type { PluginContext, PluginIdentity } from '@src/core/plugin';
import type { CommandDefinition } from '@src/system/command-definition';
import type { ParsedCliInvocation } from '@src/system/parser-cli';

import { jobReplyMessage } from '../adapter-util';

import { handleDisableCommand } from './handler';

export function adaptDisableCommand(params: {
  prefix: string;
  alias: string;
  parsed: ParsedCliInvocation;
  command: CommandDefinition;
  db: Database;
  ctx: PluginContext;
  identity: PluginIdentity;
}) {
  const raw = params.parsed.arguments.id;

  const idRaw = raw === undefined || raw === null ? null : String(raw);

  const text = handleDisableCommand({
    prefix: params.prefix,
    alias: params.alias,
    db: params.db,
    ctx: params.ctx,
    identity: params.identity,
    idRaw,
  });

  return jobReplyMessage({
    alias: params.alias,
    subcommand: 'disable',
    text,
  });
}
