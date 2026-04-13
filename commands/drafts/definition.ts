import type { SubcommandDefinition } from '@src/system/command-definition';

export const draftsDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'drafts',
  summary: 'List pending job drafts (confirm, revise, or discard).',
  aliases: [],
  arguments: [],
  options: [],
  examples: [`${prefix}${alias} drafts`],
});
