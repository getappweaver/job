import type { SubcommandDefinition } from '@src/system/command-definition';

export const disableDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'disable',
  summary: 'Disable a job.',
  aliases: [],
  arguments: [
    {
      name: 'id',
      summary: 'Job id.',
      kind: 'integer',
      required: false,
    },
  ],
  options: [],
  examples: [`${prefix}${alias} disable 2`],
});
