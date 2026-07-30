import type { SubcommandDefinition } from '@src/system/command-definition';

export const logsDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'logs',
  summary: 'Show complete chronological execution logs for a job.',
  aliases: [],
  arguments: [
    {
      name: 'id',
      summary: 'Job id.',
      kind: 'integer',
      required: false,
    },
    {
      name: 'run_id',
      summary: 'Optional run id.',
      kind: 'integer',
      required: false,
    },
  ],
  options: [],
  examples: [`${prefix}${alias} logs 1`, `${prefix}${alias} logs 1 12`],
});
