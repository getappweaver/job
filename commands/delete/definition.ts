import type { SubcommandDefinition } from '@src/system/command-definition';

export const deleteDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'delete',
  summary: 'Delete a job permanently.',
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
  examples: [`${prefix}${alias} delete 4`],
});
