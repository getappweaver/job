import type { Database } from 'bun:sqlite';

import { PROMPT_SESSION_EXIT } from '@src/prompt-session';

import type { BaseProps } from '../../command-context';
import { createJob } from '../../db';
import {
  deleteDraft,
  getDraftBySessionIndex,
  listDraftsBySession,
  updateDraftEntry,
  type JobDraftRow,
} from '../../drafts';
import { formatNextRun } from '../../format';
import type { JobDraftInput } from '../../types';

import { formatCreateWithPreview } from './format-preview';
import { generateCreateWithParams } from './generate';
import { buildRevisePrompt } from './prompts';

function formatDraftReview(params: {
  draft: JobDraftRow;
  prefix: string;
  alias: string;
  index: number;
  total: number;
}): string {
  return [
    `AI job draft review ${params.index + 1}/${params.total}`,
    `Current Draft: #${params.draft.id} [${params.draft.kind}]`,
    '',
    formatCreateWithPreview({
      draftId: String(params.draft.id),
      input: params.draft.input as JobDraftInput,
      prefix: params.prefix,
      alias: params.alias,
      includeReplyLine: false,
    }),
    '',
    'a=accept, r=revise <corrections>, d=discard, s=skip, q=quit',
  ].join('\n');
}

export function renderDraftSessionReview(params: {
  db: Database;
  prefix: string;
  alias: string;
  sessionId: string;
  index: number;
}): string {
  const drafts = listDraftsBySession(params.db, params.sessionId);

  if (drafts.length === 0) {
    return 'Session complete. No drafts remaining.';
  }

  if (params.index >= drafts.length) {
    return `Session finished. ${drafts.length} skipped draft(s) remain. Review them later with ${params.prefix}${params.alias} drafts.`;
  }

  const draft = drafts[params.index]!;

  if (draft.kind !== 'create') {
    return `Session finished. Unsupported draft kind in AI review: ${draft.kind}.`;
  }

  return formatDraftReview({
    draft,
    prefix: params.prefix,
    alias: params.alias,
    index: params.index,
    total: drafts.length,
  });
}

function parseInteractiveAction(input: string): {
  action: 'accept' | 'revise' | 'discard' | 'skip' | 'quit' | null;
  text: string;
} {
  const trimmed = input.trim();
  const [head, ...rest] = trimmed.split(/\s+/);
  const actionRaw = head?.toLowerCase() ?? '';
  const text = rest.join(' ').trim();

  const action =
    actionRaw === 'a' || actionRaw === 'accept'
      ? 'accept'
      : actionRaw === 'r' || actionRaw === 'revise'
        ? 'revise'
        : actionRaw === 'd' || actionRaw === 'discard'
          ? 'discard'
          : actionRaw === 's' || actionRaw === 'skip'
            ? 'skip'
            : actionRaw === 'q' || actionRaw === 'quit'
              ? 'quit'
              : null;

  return { action, text };
}

async function reviseDraft(
  props: BaseProps & {
    draft: JobDraftRow;
    corrections: string;
  },
): Promise<string | null> {
  const { db, ctx, draft, corrections } = props;

  if (!ctx.runAgent) {
    return 'Revise requires an agent backend.';
  }

  if (draft.kind !== 'create') {
    return `Draft ${draft.id} is not a create draft (kind: ${draft.kind}).`;
  }

  let input: JobDraftInput;

  try {
    input = await generateCreateWithParams({
      systemPrompt: buildRevisePrompt(draft, corrections),
      runAgent: ctx.runAgent,
      defaults: ctx.defaults,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    return `Failed to revise parameters: ${msg}`;
  }

  updateDraftEntry(db, draft.id, {
    sessionId: draft.sessionId,
    kind: 'create',
    input,
    originalPrompt: `${draft.originalPrompt} (revised: ${corrections})`,
  });

  return null;
}

export async function applyDraftSessionAction(
  props: BaseProps & {
    sessionId: string;
    index: number;
    action: 'accept' | 'revise' | 'discard' | 'skip' | 'quit';
    input?: string;
  },
): Promise<string> {
  if (props.action === 'quit') {
    return `Session finished. Remaining drafts can be reviewed later with ${props.prefix}${props.alias} drafts.`;
  }

  const draft = getDraftBySessionIndex(props.db, props.sessionId, props.index);

  if (!draft) {
    return renderDraftSessionReview(props);
  }

  if (props.action === 'skip') {
    return renderDraftSessionReview({ ...props, index: props.index + 1 });
  }

  if (props.action === 'discard') {
    deleteDraft(props.db, draft.id);

    return renderDraftSessionReview(props);
  }

  if (props.action === 'revise') {
    const corrections = props.input?.trim();

    if (!corrections) {
      return 'Revise requires correction text.';
    }

    const error = await reviseDraft({ ...props, draft, corrections });

    if (error) {
      return error;
    }

    return renderDraftSessionReview(props);
  }

  if (draft.kind !== 'create') {
    return `Draft ${draft.id} is not a create draft (kind: ${draft.kind}).`;
  }

  try {
    const job = createJob(props.db, draft.input);
    deleteDraft(props.db, draft.id);

    const budgetLine =
      job.budget_sats != null
        ? `\nBudget: ${job.budget_sats} sats (auto-flow)`
        : '';

    const createdMessage = `Job created: ${job.id}\nName: ${job.name}\nWhen: ${job.schedule_description}\nNext run: ${formatNextRun(job.next_run_at)}${budgetLine}`;
    const next = renderDraftSessionReview(props);

    return next === 'Session complete. No drafts remaining.'
      ? createdMessage
      : `${createdMessage}\n\n${next}`;
  } catch (err) {
    return `Failed to create job: ${String(err)}`;
  }
}

export async function runDraftSessionInteractive(
  props: BaseProps & { sessionId: string },
): Promise<string> {
  let index = 0;

  while (true) {
    const view = renderDraftSessionReview({
      db: props.db,
      prefix: props.prefix,
      alias: props.alias,
      sessionId: props.sessionId,
      index,
    });

    if (
      view === 'Session complete. No drafts remaining.' ||
      view.startsWith('Session finished.')
    ) {
      return view;
    }

    const answer = await props.ctx.promptFn(view);

    if (answer === PROMPT_SESSION_EXIT) {
      return `Session finished. Remaining drafts can be reviewed later with ${props.prefix}${props.alias} drafts.`;
    }

    const parsed = parseInteractiveAction(answer);

    if (!parsed.action) {
      continue;
    }

    const result = await applyDraftSessionAction({
      ...props,
      sessionId: props.sessionId,
      index,
      action: parsed.action,
      input: parsed.text,
    });

    if (parsed.action === 'quit') {
      return result;
    }

    if (
      result === 'Session complete. No drafts remaining.' ||
      result.startsWith('Session finished.')
    ) {
      return result;
    }

    if (parsed.action === 'skip') {
      index += 1;
    }
  }
}
