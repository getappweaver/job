import { renderHelpText } from '@src/commands/help/renderers/text';
import type { HelpRepresentation } from '@src/commands/help/representation';
import type { TextRenderContext } from '@src/system/render-context';
import { assertUnreachable } from '@src/utils';

import { renderMessageCli } from '../output/message/renderers/cli';
import type { MessageRepresentation } from '../output/message/schema';

export type JobCliRepresentation = HelpRepresentation | MessageRepresentation;

export function renderJobCli(
  representation: JobCliRepresentation,
  context: TextRenderContext,
): string {
  switch (representation.kind) {
    case 'help':
      return renderHelpText(representation, context);
    case 'message':
      return renderMessageCli(representation, context);
    default:
      return assertUnreachable(representation);
  }
}
