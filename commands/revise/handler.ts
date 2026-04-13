import type { BaseProps } from '../../command-context';
import {
  createDraftSessionId,
  deleteDraft,
  getDraft,
  storeDraft,
} from '../../drafts';
import type { JobDraftInput } from '../../types';

import { formatCreateWithPreview } from '../ai/format-preview';
import { generateCreateWithParams } from '../ai/generate';
import { buildRevisePrompt } from '../ai/prompts';

export async function handleReviseCommand(
  props: BaseProps & {
    draftIdRaw: string | null;
    corrections: string;
  },
): Promise<string> {
  const { prefix, alias, db, ctx, draftIdRaw, corrections } = props;
  const cmd = `${prefix}${alias}`;

  if (!ctx.runAgent) {
    return `${cmd} revise requires an agent backend. Set backend (e.g. !backend opencode-sdk) and try again.`;
  }

  if (!draftIdRaw) {
    return `Usage: ${cmd} revise <draft_id> <corrections>`;
  }

  if (!corrections.trim()) {
    return `Usage: ${cmd} revise <draft_id> <corrections>`;
  }

  const draftId = parseInt(draftIdRaw, 10);

  if (Number.isNaN(draftId)) {
    return `Draft not found: ${draftIdRaw}. Use a numeric draft id.`;
  }

  const entry = getDraft(db, draftId);

  if (!entry) {
    return `Draft not found: ${draftId}.`;
  }

  if (entry.kind !== 'create') {
    return `Draft ${draftId} is not a create draft (kind: ${entry.kind}).`;
  }

  let input: JobDraftInput;

  try {
    input = await generateCreateWithParams({
      systemPrompt: buildRevisePrompt(entry, corrections),
      runAgent: ctx.runAgent,
      defaults: ctx.defaults,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    return `Failed to revise parameters: ${msg}`;
  }

  const newDraftId = storeDraft(db, {
    sessionId: createDraftSessionId(),
    kind: 'create',
    input,
    originalPrompt: `${entry.originalPrompt} (revised: ${corrections})`,
  });

  deleteDraft(db, draftId);

  return [
    `Draft #${draftId} revised. Created new draft #${newDraftId}:`,
    '',
    formatCreateWithPreview({
      draftId: String(newDraftId),
      input,
      prefix,
      alias,
    }),
    '',
    `To accept the revised draft: ${cmd} confirm ${newDraftId}`,
    `To decline the revised draft: ${cmd} discard ${newDraftId}`,
  ].join('\n');
}
