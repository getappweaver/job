import type { SubcommandDefinition } from '@src/system/command-definition';

export const historyDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'history',
  summary: 'Show recent runs for a job (default last 10).',
  aliases: [],
  arguments: [
    {
      name: 'id',
      summary: 'Job id.',
      kind: 'integer',
      required: false,
    },
    {
      name: 'limit',
      summary: 'Max runs to show (1–50, default 10).',
      kind: 'integer',
      required: false,
    },
  ],
  options: [],
  examples: [`${prefix}${alias} history 1`, `${prefix}${alias} history 1 20`],
});
