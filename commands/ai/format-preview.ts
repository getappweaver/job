// ---------------------------------------------------------------------------
// plugins/job/commands/ai/format-preview.ts — human-readable draft preview text
// ---------------------------------------------------------------------------

import { formatNextRun } from '../../format';
import type { JobDraftInput } from '../../types';

export type FormatCreateWithPreviewProps = {
  draftId: string;
  input: JobDraftInput;
  prefix: string;
  alias: string;
  includeReplyLine?: boolean;
};

export function formatCreateWithPreview(
  props: FormatCreateWithPreviewProps,
): string {
  const { draftId, input, prefix, alias, includeReplyLine = true } = props;
  const cmd = `${prefix}${alias}`;
  const w = 12;

  const common = [
    `${'name'.padEnd(w)} : ${input.name}`,
    `${'prompt'.padEnd(w)} : ${input.prompt}`,
    `${'description'.padEnd(w)} : ${input.schedule_description}`,
    `${'backend'.padEnd(w)} : ${input.backend}`,
    `${'provider'.padEnd(w)} : ${input.provider}`,
    `${'model'.padEnd(w)} : ${input.model}`,
    `${'mode'.padEnd(w)} : ${input.mode}`,
    `${'budget_sats'.padEnd(w)} : ${input.budget_sats ?? '—'}`,
    `${'instructions'.padEnd(w)} : ${input.instructions ?? '—'}`,
  ];

  const execution =
    input.execution_type === 'cron'
      ? [
          `${'type'.padEnd(w)} : cron`,
          `${'schedule'.padEnd(w)} : ${input.schedule}`,
          `${'maxRuns'.padEnd(w)} : ${input.maxRuns ?? '—'}`,
        ]
      : [
          `${'type'.padEnd(w)} : one-time`,
          `${'run_at'.padEnd(w)} : ${(() => {
            const ms = new Date(input.run_at).getTime();

            return Number.isFinite(ms) ? formatNextRun(ms) : input.run_at;
          })()}`,
        ];

  const lines = [...execution, ...common];

  if (!includeReplyLine) {
    return `${lines.join('\n')}\n\nDraft ID: ${draftId}`;
  }

  return `${lines.join('\n')}

Draft ID: ${draftId}
Reply: ${cmd} confirm ${draftId} | ${cmd} revise ${draftId} <corrections> | ${cmd} discard ${draftId}`;
}
