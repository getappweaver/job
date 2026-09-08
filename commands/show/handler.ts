import type { BaseProps } from '../../command-context';
import { getJob } from '../../db';
import { formatNextRun } from '../../format';

function formatRow(label: string, value: string): string {
  return `${label.padEnd(12)} : ${value}`;
}

export function handleShowCommand(
  props: BaseProps & { idRaw: string | null },
): string {
  const { prefix, alias, db, idRaw } = props;
  const cmd = `${prefix}${alias}`;

  if (!idRaw) {
    return `Usage: ${cmd} show <id>`;
  }

  const id = parseInt(idRaw, 10);
  const idValid = !Number.isNaN(id);

  if (!idValid) {
    return `Usage: ${cmd} show <id> (id must be a number)`;
  }

  const job = getJob(db, id);

  if (!job) {
    return `Job not found: ${id}`;
  }

  const lines = [
    formatRow('id', String(job.id)),
    formatRow('name', job.name),
    formatRow('type', job.execution_type),
    ...(job.execution_type === 'cron'
      ? [
          formatRow('schedule', job.schedule),
          formatRow(
            'maxRuns',
            job.max_runs != null ? String(job.max_runs) : '—',
          ),
        ]
      : [
          formatRow(
            'run_at',
            job.run_at != null ? formatNextRun(job.run_at) : '—',
          ),
        ]),
    formatRow('description', job.schedule_description),
    formatRow('task', job.task_type),
    ...(job.task_type === 'plugin-tool'
      ? [
          formatRow('tool', `${job.tool_alias}.${job.tool_name}`),
          formatRow('input', JSON.stringify(job.tool_input)),
        ]
      : [
          formatRow(
            'prompt',
            `${job.prompt.slice(0, 80)}${job.prompt.length > 80 ? '…' : ''}`,
          ),
        ]),
    formatRow('enabled', job.enabled ? 'yes' : 'no'),
    formatRow('next_run', formatNextRun(job.next_run_at)),
    formatRow('backend', job.backend),
    formatRow('provider', job.provider),
    formatRow('model', job.model || '(default)'),
    formatRow('mode', job.mode),
    formatRow(
      'budget',
      job.budget_sats != null ? `${job.budget_sats} sats (auto-flow)` : '—',
    ),
    formatRow(
      'instructions',
      job.instructions != null
        ? job.instructions.slice(0, 120) +
            (job.instructions.length > 120 ? '…' : '')
        : '—',
    ),
  ];

  return lines.join('\n');
}
