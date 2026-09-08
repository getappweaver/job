// ---------------------------------------------------------------------------
// plugins/job/format.ts — shared job list/detail formatting
// ---------------------------------------------------------------------------

import type { Job } from './types';

export function formatContextLine(job: Job): string {
  if (job.task_type === 'plugin-tool') {
    return `${job.tool_alias}.${job.tool_name}`;
  }

  const modelPart = job.model ? job.model : '—';

  return [job.backend, job.provider, modelPart, job.mode].join(' - ');
}

export function formatNextRun(nextRunAt: number | null): string {
  if (nextRunAt == null) {
    return '—';
  }

  return new Date(nextRunAt).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
