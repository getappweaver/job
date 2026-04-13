import type { BaseProps } from '../../command-context';
import { enableJob, getJob } from '../../db';
import { formatNextRun } from '../../format';

export function handleEnableCommand(
  props: BaseProps & { idRaw: string | null },
): string {
  const { prefix, alias, db, idRaw } = props;
  const cmd = `${prefix}${alias}`;
  const id = idRaw ? parseInt(idRaw, 10) : NaN;
  const idValid = !Number.isNaN(id);

  if (!idValid) {
    return `Usage: ${cmd} enable <id>`;
  }

  if (!getJob(db, id)) {
    return `Job not found: ${id}`;
  }

  if (enableJob(db, id)) {
    const job = getJob(db, id);

    return `Job ${id} enabled. Next run: ${formatNextRun(job?.next_run_at ?? null)}`;
  }

  return `Job ${id} is already enabled or schedule invalid.`;
}
