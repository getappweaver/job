// ---------------------------------------------------------------------------
// plugins/job/init.ts — JobPlugin definition
// ---------------------------------------------------------------------------
import { basename } from 'path';

import type { Database } from 'bun:sqlite';

import {
  parsePluginPackageJson,
  type BotPlugin,
  type PluginContext,
} from '@src/core/plugin';

import { handleJob } from './commands';
import { openDb } from './db';
import { startJobTicker } from './engine';

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
  handler: (args: string[]) => {
    if (!JobPluginContext) {
      throw new Error('JobPlugin not initialized');
    }

    if (!JobPluginDb) {
      throw new Error('JobPluginDb not initialized');
    }

    return handleJob({
      args,
      identity: JobPlugin.identity,
      helpText: JobPlugin.helpText,
      pluginDb: JobPluginDb,
      ctx: JobPluginContext,
    });
  },
  onInit: (ctx: PluginContext) => {
    JobPluginContext = ctx;

    const db = openDb();
    JobPluginDb = db;
    startJobTicker(db);
  },
  helpText: (alias: string) => [
    `Jobs: one-time future tasks or recurring schedules (cron-style), with enable/disable, run history, and manual runs. Use !${alias} ai for natural-language job drafts (confirm/discard/revise); use list, show, run, and enable/disable for control.`,
    '',
    `!${alias} help — this message`,
    `!${alias} ai <prompt>              — create a job draft from natural language`,
    `!${alias} drafts                   — list pending drafts`,
    `!${alias} confirm <draft_id>       — create job from a draft`,
    `!${alias} revise <draft_id> <text> — ask AI to revise draft params`,
    `!${alias} discard <draft_id>       — discard a draft`,
    `!${alias} list                     — list all jobs`,
    `!${alias} show <id>                — show job details`,
    `!${alias} enable <id>              — enable a job`,
    `!${alias} disable <id>             — disable a job`,
    `!${alias} delete <id>              — delete a job`,
    `!${alias} history <id> [N]         — show run history (default N=10)`,
    `!${alias} run <id>                 — run job once now`,
  ],
};
