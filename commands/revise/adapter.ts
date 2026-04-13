import type { Database } from 'bun:sqlite';

import type { PluginContext, PluginIdentity } from '@src/core/plugin';
import type { CommandDefinition } from '@src/system/command-definition';
import type { ParsedCliInvocation } from '@src/system/parser-cli';

import { jobReplyMessage } from '../adapter-util';

import { handleReviseCommand } from './handler';

function toCorrectionText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join(' ');
  }

  if (value === undefined || value === null) {
    return '';
  }

  return String(value);
}

export async function adaptReviseCommand(params: {
  prefix: string;
  alias: string;
  parsed: ParsedCliInvocation;
  command: CommandDefinition;
  db: Database;
  ctx: PluginContext;
  identity: PluginIdentity;
}) {
  const rawId = params.parsed.arguments.draftId;

  const draftIdRaw =
    rawId === undefined || rawId === null ? null : String(rawId);

  const corrections = toCorrectionText(params.parsed.arguments.corrections);

  const text = await handleReviseCommand({
    prefix: params.prefix,
    alias: params.alias,
    db: params.db,
    ctx: params.ctx,
    identity: params.identity,
    draftIdRaw,
    corrections,
  });

  return jobReplyMessage({
    alias: params.alias,
    subcommand: 'revise',
    text,
  });
}
