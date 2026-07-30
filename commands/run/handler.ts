import type { BaseProps } from '../../command-context';
import { getJob } from '../../db';
import { runJob } from '../../runner';

export async function handleRunCommand(
  props: BaseProps & { idRaw: string | null },
): Promise<string> {
  const { prefix, alias, db, ctx, idRaw } = props;
  const cmd = `${prefix}${alias}`;
  const id = idRaw ? parseInt(idRaw, 10) : NaN;
  const idValid = !Number.isNaN(id);

  if (!idValid) {
    return `Usage: ${cmd} run <id>`;
  }

  const job = getJob(db, id);

  if (!job) {
    return `Job not found: ${id}`;
  }

  try {
    const result = await runJob({
      job,
      pluginDb: db,
      ctx,
      trigger: 'manual',
      scheduledFor: null,
    });

    if (result.status === 'already_running') {
      return `Job ${id} (${job.name}) is already running.`;
    }

    if (result.status === 'failed') {
      return `Job ${id} (${job.name}) run failed. See job logs (${prefix}${alias} logs ${id}).`;
    }

    return `Job ${id} (${job.name}) run completed. Result stored in job history (${prefix}${alias} history ${id}).`;
  } catch (err) {
    return `Run failed: ${String(err)}`;
  }
}
