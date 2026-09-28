// ---------------------------------------------------------------------------
// plugins/job/command-context.ts — shared props for job command handlers
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { PluginContext, PluginIdentity, PromptFn } from '@src/core/plugin';

export type JobCommandContext = PluginContext & {
  promptFn: PromptFn;
};

export type BaseProps = {
  prefix: string;
  alias: string;
  db: Database;
  ctx: JobCommandContext;
  identity: PluginIdentity;
};
