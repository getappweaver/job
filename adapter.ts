import type { Database } from 'bun:sqlite';

import type { PluginContext, PluginIdentity } from '@src/core/plugin';
import type { MessageSource } from '@src/messaging';
import { parseCliInput } from '@src/system/parser-cli';
import type { WebNodeRoot } from '@src/web/ui-schema';

import { adaptAiCommand } from './commands/ai/adapter';
import { adaptConfirmCommand } from './commands/confirm/adapter';
import { adaptDeleteCommand } from './commands/delete/adapter';
import { adaptDisableCommand } from './commands/disable/adapter';
import { adaptDiscardCommand } from './commands/discard/adapter';
import { adaptDraftsCommand } from './commands/drafts/adapter';
import { adaptEnableCommand } from './commands/enable/adapter';
import { adaptHelpCommand } from './commands/help/adapter';
import { adaptHistoryCommand } from './commands/history/adapter';
import { adaptListCommand } from './commands/list/adapter';
import { adaptReviseCommand } from './commands/revise/adapter';
import { adaptRunCommand } from './commands/run/adapter';
import { adaptShowCommand } from './commands/show/adapter';
import { getJobCommandDefinition } from './help';
import type { JobCommandAdapterParams } from './types';

type JobSubcommand =
  | 'help'
  | 'ai'
  | 'drafts'
  | 'confirm'
  | 'revise'
  | 'discard'
  | 'list'
  | 'show'
  | 'enable'
  | 'disable'
  | 'delete'
  | 'history'
  | 'run';

type MaybePromise<T> = T | Promise<T>;

type JobCommandAdapter = (
  params: JobCommandAdapterParams,
) => MaybePromise<string | WebNodeRoot>;

const normalizedDefinitions = new Map<
  string,
  ReturnType<typeof getJobCommandDefinition>
>();

const subcommandAdapters: Record<JobSubcommand, JobCommandAdapter> = {
  help: adaptHelpCommand,
  ai: adaptAiCommand,
  drafts: adaptDraftsCommand,
  confirm: adaptConfirmCommand,
  revise: adaptReviseCommand,
  discard: adaptDiscardCommand,
  list: adaptListCommand,
  show: adaptShowCommand,
  enable: adaptEnableCommand,
  disable: adaptDisableCommand,
  delete: adaptDeleteCommand,
  history: adaptHistoryCommand,
  run: adaptRunCommand,
};

function getDefinitionKey(prefix: string, alias: string): string {
  return `${prefix}:${alias}`;
}

function getNormalizedDefinition(prefix: string, alias: string) {
  const key = getDefinitionKey(prefix, alias);
  const cached = normalizedDefinitions.get(key);

  if (cached) {
    return cached;
  }

  const normalized = getJobCommandDefinition(prefix, alias);

  normalizedDefinitions.set(key, normalized);

  return normalized;
}

function isJobSubcommand(value: string): value is JobSubcommand {
  return (
    value === 'help' ||
    value === 'ai' ||
    value === 'drafts' ||
    value === 'confirm' ||
    value === 'revise' ||
    value === 'discard' ||
    value === 'list' ||
    value === 'show' ||
    value === 'enable' ||
    value === 'disable' ||
    value === 'delete' ||
    value === 'history' ||
    value === 'run'
  );
}

export async function handleJob(params: {
  args: string[];
  prefix: string;
  alias: string;
  source: MessageSource;
  db: Database;
  ctx: PluginContext;
  identity: PluginIdentity;
}): Promise<string | WebNodeRoot> {
  const normalizedArgs = params.args.length === 0 ? ['help'] : params.args;
  const subcommand = normalizedArgs[0]?.toLowerCase();

  if (!subcommand || !isJobSubcommand(subcommand)) {
    return `Unknown command: ${params.prefix}${params.alias} ${subcommand ?? 'unknown'}`;
  }

  try {
    const command = getNormalizedDefinition(params.prefix, params.alias);

    const parsed = parseCliInput({
      command,
      tokens: normalizedArgs,
      rawInput:
        `${params.prefix}${params.alias} ${normalizedArgs.join(' ')}`.trim(),
    });

    if (!isJobSubcommand(parsed.subcommand)) {
      return `Unknown command: ${params.prefix}${params.alias} ${parsed.subcommand}`;
    }

    const adapter = subcommandAdapters[parsed.subcommand];

    return await adapter({
      prefix: params.prefix,
      alias: params.alias,
      parsed,
      command,
      db: params.db,
      source: params.source,
      ctx: params.ctx,
      identity: params.identity,
    });
  } catch (err) {
    return String(err instanceof Error ? err.message : err);
  }
}
