import type { SubcommandDefinition } from '@src/system/command-definition';

export const discardDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'discard',
  summary: 'Delete a pending draft.',
  aliases: [],
  arguments: [
    {
      name: 'draftId',
      summary: 'Numeric draft id.',
      kind: 'integer',
      required: false,
    },
  ],
  options: [],
  examples: [`${prefix}${alias} discard 3`],
});
