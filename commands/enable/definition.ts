import type { SubcommandDefinition } from '@src/system/command-definition';

export const enableDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'enable',
  summary: 'Enable a job.',
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
  examples: [`${prefix}${alias} enable 2`],
});
