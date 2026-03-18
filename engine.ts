// ---------------------------------------------------------------------------
// plugins/jobs/engine.ts — Scheduler: tick every 60s, run due jobs with backend from job row
//
// Started in onInit. runnerContext is set when the handler runs so ticks can execute jobs.
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import { log } from '@src/logger';

import { getJobRunCount, getNextRunAt, listDueJobs, updateJobRunTimes } from './db';
import { JobPluginContext } from './init';
import { runJob } from './runner';

const TICK_MS = 60_000;

/**
 * Start the plugin job engine from onInit so it runs after restarts.
 * Jobs run only after the handler has set runnerContext via setPluginJobRunnerContext.
 */
export function startJobTicker(pluginDb: Database): void {
  async function tick(): Promise<void> {
    const ctx = JobPluginContext;

    if (!ctx) {
      log.error('JobsPluginContext not set');

      return;
    }

    const due = listDueJobs(pluginDb);

    for (const job of due) {
      const startedAt = Date.now();

      try {
        await runJob({ job, pluginDb, ctx });
      } catch (err) {
        log.error(`Job ${job.id} (${job.name}) run failed: ${String(err)}`);

        const runCount = getJobRunCount(pluginDb, job.id);
        const nextRunAt = getNextRunAt(job, startedAt, runCount);

        updateJobRunTimes(pluginDb, job.id, startedAt, nextRunAt ?? null);
      }
    }
  }

  setInterval(() => {
    tick().catch(() => {});
  }, TICK_MS);
}
