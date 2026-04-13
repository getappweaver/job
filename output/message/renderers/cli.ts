import type { TextRenderContext } from '@src/system/render-context';

import type { MessageRepresentation } from '../schema';

export function renderMessageCli(
  representation: MessageRepresentation,
  _context: TextRenderContext,
): string {
  return representation.data.text;
}
