import type { Database } from 'bun:sqlite';

import type { PluginContext, PluginIdentity } from '@src/core/plugin';
import { parseCliInput } from '@src/system/parser-cli';

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
import { createMessageRepresentation } from './output/message/builder';
import { renderJobCli, type JobCliRepresentation } from './renderers/cli';

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

type JobCommandAdapter = (params: {
  prefix: string;
  alias: string;
  parsed: ReturnType<typeof parseCliInput>;
  command: ReturnType<typeof getJobCommandDefinition>;
  db: Database;
  ctx: PluginContext;
  identity: PluginIdentity;
}) => MaybePromise<JobCliRepresentation>;

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
  db: Database;
  ctx: PluginContext;
  identity: PluginIdentity;
}): Promise<string> {
  const normalizedArgs = params.args.length === 0 ? ['help'] : params.args;
  const subcommand = normalizedArgs[0]?.toLowerCase();

  const commandNotFound = createMessageRepresentation({
    command: params.alias,
    subcommand: subcommand ?? 'unknown',
    tone: 'error',
    text: `Unknown command: ${params.prefix}${params.alias} ${subcommand ?? 'unknown'}`,
  });

  if (!subcommand || !isJobSubcommand(subcommand)) {
    return renderJobCli(commandNotFound, {
      prefix: params.prefix,
    });
  }

  let representation: JobCliRepresentation;

  try {
    const command = getNormalizedDefinition(params.prefix, params.alias);

    const parsed = parseCliInput({
      command,
      tokens: normalizedArgs,
      rawInput:
        `${params.prefix}${params.alias} ${normalizedArgs.join(' ')}`.trim(),
    });

    if (!isJobSubcommand(parsed.subcommand)) {
      return renderJobCli(commandNotFound, {
        prefix: params.prefix,
      });
    }

    const adapter = subcommandAdapters[parsed.subcommand];

    if (!adapter) {
      return renderJobCli(commandNotFound, {
        prefix: params.prefix,
      });
    }

    representation = await adapter({
      prefix: params.prefix,
      alias: params.alias,
      parsed,
      command,
      db: params.db,
      ctx: params.ctx,
      identity: params.identity,
    });
  } catch (err) {
    representation = createMessageRepresentation({
      command: params.alias,
      subcommand: subcommand ?? 'unknown',
      tone: 'error',
      text: String(err instanceof Error ? err.message : err),
    });
  }

  return renderJobCli(representation, {
    prefix: params.prefix,
  });
}
