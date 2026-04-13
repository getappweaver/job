import type { SubcommandDefinition } from '@src/system/command-definition';

export const showDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'show',
  summary: 'Show details for one job.',
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
  examples: [`${prefix}${alias} show 1`],
});
