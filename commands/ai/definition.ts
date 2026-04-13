import type { SubcommandDefinition } from '@src/system/command-definition';

export const aiDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'ai',
  summary:
    'Create a job draft from natural language (requires an agent backend).',
  aliases: [],
  arguments: [
    {
      name: 'prompt',
      summary: 'Natural-language description of the schedule and task.',
      kind: 'string',
      required: false,
      variadic: true,
    },
  ],
  options: [],
  examples: [
    `${prefix}${alias} ai daily summary every weekday at 9am`,
    `${prefix}${alias} ai remind me in 15 minutes to check the logs`,
  ],
});
