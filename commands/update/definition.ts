import type { SubcommandDefinition } from '@src/system/command-definition';

export const updateDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'update',
  summary: 'Update a job name, model, prompt, or execution instructions.',
  aliases: ['edit'],
  arguments: [
    {
      name: 'id',
      summary: 'Job id.',
      kind: 'integer',
      required: true,
    },
  ],
  options: [
    {
      name: 'name',
      flag: '--name',
      summary: 'Job name.',
      kind: 'string',
      required: false,
    },
    {
      name: 'model',
      flag: '--model',
      summary: 'Model override; reset uses the backend default.',
      kind: 'string',
      required: false,
    },
    {
      name: 'prompt',
      flag: '--prompt',
      summary: 'Prompt executed when the job runs.',
      kind: 'string',
      required: false,
      webInput: 'textarea',
    },
    {
      name: 'instructions',
      flag: '--instructions',
      summary: 'Extra execution instructions; reset clears them.',
      kind: 'string',
      required: false,
      webInput: 'textarea',
    },
  ],
  examples: [
    `${prefix}${alias} update 2 --model openai/gpt-5 --prompt "Review new posts"`,
  ],
});
