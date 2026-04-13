import type { Database } from 'bun:sqlite';

import type { PluginContext, PluginIdentity } from '@src/core/plugin';
import type { CommandDefinition } from '@src/system/command-definition';
import type { ParsedCliInvocation } from '@src/system/parser-cli';

import { jobReplyMessage } from '../adapter-util';

import { handleAiCommand } from './handler';

function toPromptTokens(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [String(value)];
}

export async function adaptAiCommand(params: {
  prefix: string;
  alias: string;
  parsed: ParsedCliInvocation;
  command: CommandDefinition;
  db: Database;
  ctx: PluginContext;
  identity: PluginIdentity;
}) {
  const promptTokens = toPromptTokens(params.parsed.arguments.prompt);

  const text = await handleAiCommand({
    prefix: params.prefix,
    alias: params.alias,
    db: params.db,
    ctx: params.ctx,
    identity: params.identity,
    promptTokens,
  });

  return jobReplyMessage({
    alias: params.alias,
    subcommand: 'ai',
    text,
  });
}
