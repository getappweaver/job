import type { SubcommandDefinition } from '@src/system/command-definition';

export const reviseDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'revise',
  summary:
    'Ask the agent to revise a create draft (requires an agent backend).',
  aliases: [],
  arguments: [
    {
      name: 'draftId',
      summary: 'Numeric draft id.',
      kind: 'integer',
      required: false,
    },
    {
      name: 'corrections',
      summary: 'What to change in the draft.',
      kind: 'string',
      required: false,
      variadic: true,
    },
  ],
  options: [],
  examples: [`${prefix}${alias} revise 2 run at 10am instead of 9am`],
});
