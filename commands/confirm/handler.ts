import type { BaseProps } from '../../command-context';
import {
  createJob,
  linkSchedulerResourceToJob,
} from '../../db';
import { deleteDraft, getDraft } from '../../drafts';
import { formatNextRun } from '../../format';

export function handleConfirmCommand(
  props: BaseProps & { draftIdRaw: string | null },
): string {
  const { prefix, alias, db, draftIdRaw } = props;
  const cmd = `${prefix}${alias}`;

  if (!draftIdRaw) {
    return `Usage: ${cmd} confirm <draft_id>`;
  }

  const draftId = parseInt(draftIdRaw, 10);

  if (Number.isNaN(draftId)) {
    return `Draft not found: ${draftIdRaw}. Use a numeric draft id (e.g. ${cmd} confirm 1).`;
  }

  const entry = getDraft(db, draftId);

  if (!entry) {
    return `Draft not found: ${draftId}.`;
  }

  try {
    if (entry.kind !== 'create') {
      return `Draft ${draftId} is not a create draft (kind: ${entry.kind}).`;
    }

    const job = createJob(db, entry.input);
    linkSchedulerResourceToJob({ db, draftId, jobId: job.id });
    deleteDraft(db, draftId);

    const budgetLine =
      job.budget_sats != null
        ? `\nBudget: ${job.budget_sats} sats (auto-flow)`
        : '';

    return `Job created: ${job.id}\nName: ${job.name}\nWhen: ${job.schedule_description}\nNext run: ${formatNextRun(job.next_run_at)}${budgetLine}`;
  } catch (err) {
    return `Failed to create job: ${String(err)}`;
  }
}
