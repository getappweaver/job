import type { BaseProps } from '../../command-context';
import { getJob, listJobRuns } from '../../db';

export function handleHistoryCommand(
  props: BaseProps & { idRaw: string | null; limitRaw: string | null },
): string {
  const { prefix, alias, db, idRaw, limitRaw } = props;
  const cmd = `${prefix}${alias}`;
  const id = idRaw ? parseInt(idRaw, 10) : NaN;
  const idValid = !Number.isNaN(id);

  if (!idValid) {
    return `Usage: ${cmd} history <id> [N]`;
  }

  const job = getJob(db, id);

  if (!job) {
    return `Job not found: ${id}`;
  }

  const n = Math.min(50, Math.max(1, parseInt(limitRaw ?? '10', 10) || 10));

  const runs = listJobRuns(db, id, n);

  if (runs.length === 0) {
    return `No runs yet for "${job.name}".`;
  }

  const lines = runs.map((r) => {
    const start = new Date(r.started_at).toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const duration =
      r.finished_at != null
        ? `${Math.round((r.finished_at - r.started_at) / 1000)}s`
        : '—';

    const err = r.error ? `: ${r.error.slice(0, 40)}…` : '';

    return `#${r.id} ${start} — ${r.status} (${duration})${err}`;
  });

  return `History for "${job.name}" (last ${n}):\n${lines.join('\n')}`;
}
