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
      name: 'modelSource',
      flag: '--model-source',
      summary:
        'Model source provider or alias; inherit follows the workspace default.',
      kind: 'string',
      required: false,
    },
    {
      name: 'workspace',
      flag: '--workspace',
      summary: 'Workspace: parent, appweaver, or inherit.',
      kind: 'string',
      required: false,
    },
    {
      name: 'stickySession',
      flag: '--sticky-session',
      summary: 'Reuse the previous session on later runs: true or false.',
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
