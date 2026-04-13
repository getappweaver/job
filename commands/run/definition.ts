import type { SubcommandDefinition } from '@src/system/command-definition';

export const runDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'run',
  summary: 'Run a job once immediately.',
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
  examples: [`${prefix}${alias} run 1`],
});
