import type { Database } from 'bun:sqlite';

import type { PluginContext, PluginIdentity } from '@src/core/plugin';
import type { CommandDefinition } from '@src/system/command-definition';
import type { ParsedCliInvocation } from '@src/system/parser-cli';

import { jobReplyMessage } from '../adapter-util';

import { handleDraftsCommand } from './handler';

export function adaptDraftsCommand(params: {
  prefix: string;
  alias: string;
  parsed: ParsedCliInvocation;
  command: CommandDefinition;
  db: Database;
  ctx: PluginContext;
  identity: PluginIdentity;
}) {
  const text = handleDraftsCommand({
    prefix: params.prefix,
    alias: params.alias,
    db: params.db,
    ctx: params.ctx,
    identity: params.identity,
  });

  return jobReplyMessage({
    alias: params.alias,
    subcommand: 'drafts',
    text,
  });
}
