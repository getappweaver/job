import type { BaseProps } from '../../command-context';
import { listJobs } from '../../db';
import { formatContextLine, formatNextRun } from '../../format';
import type { Job } from '../../types';

function formatRow(label: string, value: string): string {
  return `${label.padEnd(12)} : ${value}`;
}

export function handleListCommand(props: BaseProps): string {
  const { prefix, alias, db } = props;
  const cmd = `${prefix}${alias}`;
  const jobs = listJobs(db);

  if (jobs.length === 0) {
    return `No jobs. Use ${cmd} ai <prompt> to add one.`;
  }

  const blocks = jobs.map((job: Job) => {
    const scheduleValue =
      job.execution_type === 'cron'
        ? job.max_runs != null
          ? `${job.schedule_description} (max ${job.max_runs})`
          : job.schedule_description
        : `${job.schedule_description} (once)`;

    return [
      `#${job.id} ${job.name}`,
      formatRow('enabled', job.enabled ? 'yes' : 'no'),
      formatRow('schedule', scheduleValue),
      formatRow('next_run', formatNextRun(job.next_run_at)),
      formatRow('context', formatContextLine(job)),
    ].join('\n');
  });

  return ['Jobs:', '', blocks.join('\n\n')].join('\n');
}
