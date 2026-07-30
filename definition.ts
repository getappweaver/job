import { createHelpSubcommandDefinition } from '@src/commands/help/command';
import type { CommandDefinition } from '@src/system/command-definition';

import { aiDefinition } from './commands/ai/definition';
import { confirmDefinition } from './commands/confirm/definition';
import { deleteDefinition } from './commands/delete/definition';
import { disableDefinition } from './commands/disable/definition';
import { discardDefinition } from './commands/discard/definition';
import { draftsDefinition } from './commands/drafts/definition';
import { enableDefinition } from './commands/enable/definition';
import { historyDefinition } from './commands/history/definition';
import { listDefinition } from './commands/list/definition';
import { logsDefinition } from './commands/logs/definition';
import { reviseDefinition } from './commands/revise/definition';
import { runDefinition } from './commands/run/definition';
import { showDefinition } from './commands/show/definition';
import { updateDefinition } from './commands/update/definition';

export const commandDefinition = (
  prefix: string,
  alias: string,
): CommandDefinition => ({
  name: alias,
  summary:
    'Scheduled agent jobs: one-time or cron, drafts via AI, list/show/history/run.',
  aliases: [],
  subcommands: [
    createHelpSubcommandDefinition(prefix, alias, {
      topicArgSummary:
        'Optional subcommand: ai, drafts, list, show, confirm, run, …',
      exampleTopics: ['ai', 'list', 'drafts'],
    }),
    aiDefinition(prefix, alias),
    draftsDefinition(prefix, alias),
    confirmDefinition(prefix, alias),
    reviseDefinition(prefix, alias),
    discardDefinition(prefix, alias),
    listDefinition(prefix, alias),
    showDefinition(prefix, alias),
    updateDefinition(prefix, alias),
    enableDefinition(prefix, alias),
    disableDefinition(prefix, alias),
    deleteDefinition(prefix, alias),
    historyDefinition(prefix, alias),
    logsDefinition(prefix, alias),
    runDefinition(prefix, alias),
  ],
});
