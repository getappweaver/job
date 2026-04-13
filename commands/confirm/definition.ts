import type { SubcommandDefinition } from '@src/system/command-definition';

export const confirmDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'confirm',
  summary: 'Create a job from a pending create draft.',
  aliases: [],
  arguments: [
    {
      name: 'draftId',
      summary: 'Numeric draft id from drafts list.',
      kind: 'integer',
      required: false,
    },
  ],
  options: [],
  examples: [`${prefix}${alias} confirm 1`],
});
