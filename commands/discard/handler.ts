import type { BaseProps } from '../../command-context';
import { deleteDraft } from '../../drafts';

export function handleDiscardCommand(
  props: BaseProps & { draftIdRaw: string | null },
): string {
  const { prefix, alias, db, draftIdRaw } = props;
  const cmd = `${prefix}${alias}`;

  if (!draftIdRaw) {
    return `Usage: ${cmd} discard <draft_id>`;
  }

  const draftId = parseInt(draftIdRaw, 10);

  if (Number.isNaN(draftId)) {
    return `Draft not found: ${draftIdRaw}. Use a numeric draft id.`;
  }

  if (deleteDraft(db, draftId)) {
    return `Draft ${draftId} discarded.`;
  }

  return `Draft not found: ${draftId}.`;
}
