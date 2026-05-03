import type { SubcommandDefinition } from '@src/system/command-definition';

export const listDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'list',
  summary: 'List all jobs (markdown table).',
  aliases: [],
  arguments: [],
  options: [],
  examples: [`${prefix}${alias} list`],
  webWidget: {
    placement: 'header',
    surface: 'timeline_singleton',
    label: 'Jobs',
    modalTitle: 'Jobs',
    icon: '/plugins/job/commands/list/renderers/clock.svg',
    order: 30,
  },
});
