// ---------------------------------------------------------------------------
// plugins/job/init.ts — JobPlugin (command system v2)
// ---------------------------------------------------------------------------

import { basename } from 'path';

import type { Database } from 'bun:sqlite';

import {
  parsePluginPackageJson,
  type BotPlugin,
  type PluginContext,
} from '@src/core/plugin';

import { handleJob } from './adapter';
import { openDb } from './db';
import { startJobTicker } from './engine';
import { getJobCommandDefinition, getJobHelpLines } from './help';

const pluginDir = import.meta.dir;
const alias = basename(pluginDir);

const jobPkg = parsePluginPackageJson({ pluginDir });

if (!jobPkg) {
  throw new Error(
    `Job plugin: invalid or missing package.json. Required: name, version, dmBot.coreApiVersion, dmBot.description`,
  );
}

export let JobPluginContext: PluginContext | null = null;
export let JobPluginDb: Database | null = null;

export const JobPlugin: BotPlugin = {
  identity: {
    name: jobPkg.name,
    alias,
    version: jobPkg.version,
    description: jobPkg.description,
  },
  handler: async (args, context) => {
    if (!JobPluginContext) {
      throw new Error('JobPlugin not initialized');
    }

    if (!JobPluginDb) {
      throw new Error('JobPluginDb not initialized');
    }

    return handleJob({
      args,
      prefix: context.prefix,
      alias,
      db: JobPluginDb,
      ctx: { ...JobPluginContext, runAgent: context.runAgent },
      identity: JobPlugin.identity,
    });
  },
  onInit: (ctx: PluginContext) => {
    JobPluginContext = ctx;

    const db = openDb();
    JobPluginDb = db;
    startJobTicker(db);
  },
  helpText: (a: string, prefix: string) => [
    `Jobs: one-time future tasks or recurring schedules (cron-style), with enable/disable, run history, and manual runs. Use ${prefix}${a} ai for natural-language job drafts (confirm/discard/revise); use list, show, run, and enable/disable for control.`,
    '',
    `${prefix}${a} help [topic] — detailed help for a subcommand`,
    ...getJobHelpLines(prefix, a),
  ],
  commandDefinition: (prefix: string, pluginAlias: string) =>
    getJobCommandDefinition(prefix, pluginAlias),
};
