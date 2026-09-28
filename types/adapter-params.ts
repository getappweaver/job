import type { Database } from 'bun:sqlite';

import type { PluginIdentity } from '@src/core/plugin';
import type { MessageSource } from '@src/messaging';
import type { ParsedCliInvocation } from '@src/system/parser-cli';

import type { JobCommandContext } from '../command-context';
import type { getJobCommandDefinition } from '../help';

export type JobCommandAdapterParams = {
  prefix: string;
  alias: string;
  parsed: ParsedCliInvocation;
  command: ReturnType<typeof getJobCommandDefinition>;
  db: Database;
  source: MessageSource;
  ctx: JobCommandContext;
  identity: PluginIdentity;
};
