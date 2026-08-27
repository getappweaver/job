import { basename } from 'path';

import {
  SchedulerV1,
  type SchedulerCreateInputV1,
} from '@src/capabilities/scheduler.v1';
import { defineCapabilityProvider } from '@src/capabilities/types';
import { CapabilityResourceNotFoundError } from '@src/core/capabilities/errors';
import type { WebNode, WebNodeRoot } from '@src/web/ui-schema';

import { renderJobListComponent } from './commands/list/component';
import {
  createJob,
  createSchedulerResourceForJob,
  disableJob,
  getJob,
  getSchedulerResource,
  listSchedulerResources,
} from './db';
import { getDraft } from './drafts';
import { JobPluginContext, JobPluginDb } from './init';
import type { Job, JobDraftInput } from './types';

const alias = basename(import.meta.dir);

function text(value: string): WebNode {
  return { type: 'text', value };
}

function reviewDraft(draftId: number, input: JobDraftInput): WebNodeRoot {
  return {
    kind: 'ui',
    version: 1,
    meta: { command: alias, subcommand: 'scheduler-create' },
    tree: {
      type: 'element',
      tag: 'stack',
      props: { gap: 'sm' },
      children: [
        {
          type: 'element',
          tag: 'text',
          props: { weight: 'bold' },
          children: [text('Review scheduled job')],
        },
        {
          type: 'element',
          tag: 'text',
          props: { whiteSpace: 'pre-wrap' },
          children: [
            text(
              `Name: ${input.name}\nWhen: ${input.schedule_description}\nPrompt: ${input.prompt}`,
            ),
          ],
        },
        {
          type: 'element',
          tag: 'row',
          props: { gap: 'sm', className: 'web-form__actions' },
          children: [
            {
              type: 'element',
              tag: 'button',
              props: {
                label: 'Confirm',
                action: {
                  type: 'command',
                  command: alias,
                  subcommand: 'confirm',
                  arguments: { draftId },
                  options: {},
                  recordInTimeline: false,
                },
              },
            },
            {
              type: 'element',
              tag: 'button',
              props: {
                label: 'Discard',
                tone: 'danger',
                action: {
                  type: 'command',
                  command: alias,
                  subcommand: 'discard',
                  arguments: { draftId },
                  options: {},
                  recordInTimeline: false,
                },
              },
            },
          ],
        },
      ],
    },
  };
}

function draftInput(input: SchedulerCreateInputV1): JobDraftInput {
  if (!JobPluginContext) {
    throw new Error('Job plugin context is not initialized.');
  }

  const defaults = JobPluginContext.agent.getDefaults();

  const base = {
    name: input.name,
    prompt: input.task.prompt,
    schedule_description: input.schedule.description,
    backend: defaults.backend,
    provider: defaults.provider,
    model: defaults.model ?? '',
    mode: input.task.mode,
    workspace_target: input.task.workspaceTarget,
    budget_sats: null,
    instructions: null,
  };

  return input.schedule.type === 'cron'
    ? {
        ...base,
        execution_type: 'cron',
        schedule: input.schedule.expression,
        maxRuns: input.schedule.maxRuns,
      }
    : {
        ...base,
        execution_type: 'one-time',
        run_at: input.schedule.runAt,
      };
}

function resource(providerId: string, resourceId: string) {
  return {
    capability: { name: 'scheduler', version: 1 },
    providerId,
    resourceType: 'schedule',
    resourceId,
  } as const;
}

function jobSummary(providerId: string, resourceId: string, job: Job) {
  return {
    resource: resource(providerId, resourceId),
    status: 'created' as const,
    name: job.name,
    enabled: Boolean(job.enabled),
    scheduleDescription: job.schedule_description,
    nextRunAt: job.next_run_at,
  };
}

export const jobSchedulerProvider = defineCapabilityProvider({
  contract: SchedulerV1,
  operations: {
    [SchedulerV1.operations.create.id]: async ({ input, providerId }) => {
      if (!JobPluginDb) {
        throw new Error('Job plugin database is not initialized.');
      }

      const db = JobPluginDb;

      const jobInput = draftInput(input);

      const create = db.transaction(() => {
        const job = createJob(db, jobInput);

        if (!input.enabled) {
          disableJob(db, job.id);
        }

        const resourceId = createSchedulerResourceForJob({
          db,
          jobId: job.id,
          enabled: input.enabled,
        });

        return { job: getJob(db, job.id) ?? job, resourceId };
      });

      const created = create();

      return {
        ...jobSummary(providerId, created.resourceId, created.job),
        review: null,
      };
    },
    [SchedulerV1.operations.list.id]: async ({ providerId }) => {
      if (!JobPluginDb) {
        throw new Error('Job plugin database is not initialized.');
      }

      const db = JobPluginDb;

      const schedules = listSchedulerResources(db).flatMap((mapping) => {
        const job = mapping.jobId === null ? null : getJob(db, mapping.jobId);

        return job ? [jobSummary(providerId, mapping.resourceId, job)] : [];
      });

      return {
        schedules,
        view: renderJobListComponent({
          command: alias,
          prefix: '/',
          jobs: schedules.flatMap((schedule) => {
            const mapping = getSchedulerResource(
              db,
              schedule.resource.resourceId,
            );

            const job = mapping?.jobId ? getJob(db, mapping.jobId) : null;

            return job ? [job] : [];
          }),
        }),
      };
    },
    [SchedulerV1.operations.show.id]: async ({ input, providerId }) => {
      if (!JobPluginDb) {
        throw new Error('Job plugin database is not initialized.');
      }

      const db = JobPluginDb;

      const mapping = getSchedulerResource(db, input.resourceId);

      if (!mapping) {
        throw new CapabilityResourceNotFoundError(
          SchedulerV1.capability,
          input.resourceId,
        );
      }

      if (mapping.jobId !== null) {
        const job = getJob(db, mapping.jobId);

        if (!job) {
          throw new CapabilityResourceNotFoundError(
            SchedulerV1.capability,
            input.resourceId,
          );
        }

        return {
          ...jobSummary(providerId, input.resourceId, job),
          view: renderJobListComponent({
            command: alias,
            prefix: '/',
            jobs: [job],
          }),
        };
      }

      const draft =
        mapping.draftId === null ? null : getDraft(db, mapping.draftId);

      if (!draft || draft.kind !== 'create') {
        throw new CapabilityResourceNotFoundError(
          SchedulerV1.capability,
          input.resourceId,
        );
      }

      return {
        resource: resource(providerId, input.resourceId),
        status: 'draft' as const,
        name: draft.input.name,
        enabled: true,
        scheduleDescription: draft.input.schedule_description,
        nextRunAt: null,
        view: reviewDraft(draft.id, draft.input),
      };
    },
  },
});
