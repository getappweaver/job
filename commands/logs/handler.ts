import type { BaseProps } from '../../command-context';
import { getJob, listJobLogs } from '../../db';
import type { Job, JobRunLog } from '../../types';

type HandleLogsCommandProps = BaseProps & {
  idRaw: string | null;
  runIdRaw: string | null;
};

export type LogsCommandResult =
  | {
      ok: true;
      job: Job;
      logs: JobRunLog[];
      runId: number | null;
    }
  | { ok: false; message: string };

type ResolveLogsCommandProps = {
  prefix: string;
  alias: string;
  db: BaseProps['db'];
  idRaw: string | null;
  runIdRaw: string | null;
};

export function resolveLogsCommand({
  prefix,
  alias,
  db,
  idRaw,
  runIdRaw,
}: ResolveLogsCommandProps): LogsCommandResult {
  const cmd = `${prefix}${alias}`;
  const id = idRaw ? Number.parseInt(idRaw, 10) : Number.NaN;

  if (Number.isNaN(id)) {
    return { ok: false, message: `Usage: ${cmd} logs <id> [run-id]` };
  }

  const runId = runIdRaw ? Number.parseInt(runIdRaw, 10) : null;

  if (runIdRaw !== null && (runId === null || Number.isNaN(runId))) {
    return { ok: false, message: `Usage: ${cmd} logs <id> [run-id]` };
  }

  const job = getJob(db, id);

  if (!job) {
    return { ok: false, message: `Job not found: ${id}` };
  }

  const logs = listJobLogs({
    db,
    jobId: id,
    runId,
    afterId: null,
    limit: null,
  });

  return { ok: true, job, logs, runId };
}

export function renderLogsText(
  result: Extract<LogsCommandResult, { ok: true }>,
): string {
  const { job, logs, runId } = result;

  if (logs.length === 0) {
    return runId === null
      ? `No execution logs yet for "${job.name}".`
      : `No execution logs for run ${runId} of "${job.name}".`;
  }

  const entries = logs.map((entry) => {
    const header = [
      new Date(entry.occurred_at).toISOString(),
      `[${entry.level}]`,
      `run #${entry.run_id}`,
      entry.event,
    ].join(' ');

    const details =
      entry.details === null
        ? ''
        : `\nDetails: ${JSON.stringify(entry.details)}`;

    return `${header}\n${entry.message}${details}`;
  });

  return `Execution logs for "${job.name}":\n\n${entries.join('\n\n')}`;
}

export function handleLogsCommand(props: HandleLogsCommandProps): string {
  const result = resolveLogsCommand(props);

  return result.ok ? renderLogsText(result) : result.message;
}
