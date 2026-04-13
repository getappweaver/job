import type { Database } from 'bun:sqlite';

import type { PluginContext, PluginIdentity } from '@src/core/plugin';
import type { CommandDefinition } from '@src/system/command-definition';
import type { ParsedCliInvocation } from '@src/system/parser-cli';

import { jobReplyMessage } from '../adapter-util';

import { handleDiscardCommand } from './handler';

export function adaptDiscardCommand(params: {
  prefix: string;
  alias: string;
  parsed: ParsedCliInvocation;
  command: CommandDefinition;
  db: Database;
  ctx: PluginContext;
  identity: PluginIdentity;
}) {
  const raw = params.parsed.arguments.draftId;

  const draftIdRaw = raw === undefined || raw === null ? null : String(raw);

  const text = handleDiscardCommand({
    prefix: params.prefix,
    alias: params.alias,
    db: params.db,
    ctx: params.ctx,
    identity: params.identity,
    draftIdRaw,
  });

  return jobReplyMessage({
    alias: params.alias,
    subcommand: 'discard',
    text,
  });
}
