// ---------------------------------------------------------------------------
// plugins/job/command-context.ts — shared props for job command handlers
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { PluginContext, PluginIdentity } from '@src/core/plugin';

export type BaseProps = {
  prefix: string;
  alias: string;
  db: Database;
  ctx: PluginContext;
  identity: PluginIdentity;
};
