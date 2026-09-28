import { basename } from 'path';

import {
  SchedulerV1,
  type SchedulerCreateInputV1,
} from '@src/capabilities/scheduler.v1';
import {
  SchedulerV2,
  type SchedulerCreateInputV2,
  type SchedulerTaskV2,
} from '@src/capabilities/scheduler.v2';
import {
  SchedulerV3,
  type SchedulerCreateInputV3,
  type SchedulerTaskV3,
} from '@src/capabilities/scheduler.v3';
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
  updateJobTask,
  updateJobDetails,
} from './db';
import { getDraft } from './drafts';
import { JobPluginContext, JobPluginDb } from './init';
import { schedulerTaskForJob, type Job, type JobDraftInput } from './types';

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

  const base = {
    name: input.name,
    prompt: input.task.prompt,
    schedule_description: input.schedule.description,
    backend: 'opencode',
    provider: 'local',
    model: '',
    model_configured: false,
    model_source_id: null,
    sticky_session: false,
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

type SchedulerV2JobInput = JobDraftInput & { task: SchedulerTaskV2 };

function draftInputV2(input: SchedulerCreateInputV2): SchedulerV2JobInput {
  if (!JobPluginContext) {
    throw new Error('Job plugin context is not initialized.');
  }

  const prompt =
    input.task.type === 'agent-prompt'
      ? input.task.prompt
      : `Run plugin tool ${input.task.alias}.${input.task.toolName}.`;

  const base = {
    name: input.name,
    prompt,
    schedule_description: input.schedule.description,
    backend: 'opencode',
    provider: 'local',
    model: '',
    model_configured: false,
    model_source_id: null,
    sticky_session: false,
    workspace_target: 'appweaver',
    budget_sats: null,
    instructions: null,
    task: input.task,
  } as const;

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

function resourceV2(providerId: string, resourceId: string) {
  return {
    capability: { name: 'scheduler', version: 2 },
    providerId,
    resourceType: 'schedule',
    resourceId,
  } as const;
}

function jobSummaryV2(providerId: string, resourceId: string, job: Job) {
  return {
    resource: resourceV2(providerId, resourceId),
    status: 'created' as const,
    name: job.name,
    enabled: Boolean(job.enabled),
    scheduleDescription: job.schedule_description,
    nextRunAt: job.next_run_at,
    task: schedulerTaskForJob(job),
  };
}

export const jobSchedulerV2Provider = defineCapabilityProvider({
  contract: SchedulerV2,
  operations: {
    [SchedulerV2.operations.create.id]: async ({ input, providerId }) => {
      if (!JobPluginDb) {
        throw new Error('Job plugin database is not initialized.');
      }

      const db = JobPluginDb;
      const jobInput = draftInputV2(input);

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
        ...jobSummaryV2(providerId, created.resourceId, created.job),
        review: null,
      };
    },
    [SchedulerV2.operations.list.id]: async ({ providerId }) => {
      if (!JobPluginDb) {
        throw new Error('Job plugin database is not initialized.');
      }

      const db = JobPluginDb;

      const schedules = listSchedulerResources(db).flatMap((mapping) => {
        const job = mapping.jobId === null ? null : getJob(db, mapping.jobId);

        return job ? [jobSummaryV2(providerId, mapping.resourceId, job)] : [];
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
    [SchedulerV2.operations.show.id]: async ({ input, providerId }) => {
      if (!JobPluginDb) {
        throw new Error('Job plugin database is not initialized.');
      }

      const db = JobPluginDb;
      const mapping = getSchedulerResource(db, input.resourceId);
      const job = mapping?.jobId ? getJob(db, mapping.jobId) : null;

      if (!mapping || !job) {
        throw new CapabilityResourceNotFoundError(
          SchedulerV2.capability,
          input.resourceId,
        );
      }

      return {
        ...jobSummaryV2(providerId, input.resourceId, job),
        view: renderJobListComponent({
          command: alias,
          prefix: '/',
          jobs: [job],
        }),
      };
    },
    [SchedulerV2.operations['update-task'].id]: async ({
      input,
      providerId,
    }) => {
      if (!JobPluginDb) {
        throw new Error('Job plugin database is not initialized.');
      }

      const db = JobPluginDb;
      const mapping = getSchedulerResource(db, input.resourceId);

      const job = mapping?.jobId
        ? updateJobTask(db, mapping.jobId, input.task)
        : null;

      if (!mapping || !job) {
        throw new CapabilityResourceNotFoundError(
          SchedulerV2.capability,
          input.resourceId,
        );
      }

      return jobSummaryV2(providerId, input.resourceId, job);
    },
  },
});

function taskV3(job: Job): SchedulerTaskV3 {
  if (job.task_type === 'plugin-tool') {
    return {
      type: 'plugin-tool',
      alias: job.tool_alias!,
      toolName: job.tool_name!,
      input: job.tool_input ?? {},
    };
  }

  return {
    type: 'agent-prompt',
    prompt: job.prompt,
    workspaceTarget: job.workspace_target,
    modelSourceId: job.model_source_id,
    modelId: job.model_configured ? job.model : null,
    stickySession: job.sticky_session,
  };
}

function summaryV3(providerId: string, resourceId: string, job: Job) {
  return {
    resource: {
      capability: { name: 'scheduler', version: 3 },
      providerId,
      resourceType: 'schedule',
      resourceId,
    },
    status: 'created' as const,
    name: job.name,
    enabled: Boolean(job.enabled),
    scheduleDescription: job.schedule_description,
    nextRunAt: job.next_run_at,
    task: taskV3(job),
  };
}

function draftInputV3(input: SchedulerCreateInputV3) {
  const base = {
    name: input.name,
    prompt:
      input.task.type === 'agent-prompt'
        ? input.task.prompt
        : `Run plugin tool ${input.task.alias}.${input.task.toolName}.`,
    schedule_description: input.schedule.description,
    backend: 'opencode',
    provider: 'local',
    model: input.task.type === 'agent-prompt' ? (input.task.modelId ?? '') : '',
    model_configured:
      input.task.type === 'agent-prompt' && input.task.modelId !== null,
    model_source_id:
      input.task.type === 'agent-prompt' ? input.task.modelSourceId : null,
    workspace_target:
      input.task.type === 'agent-prompt' ? input.task.workspaceTarget : null,
    sticky_session:
      input.task.type === 'agent-prompt' ? input.task.stickySession : false,
    budget_sats: null,
    instructions: null,
    task: input.task,
  } as const;

  return input.schedule.type === 'cron'
    ? {
        ...base,
        execution_type: 'cron' as const,
        schedule: input.schedule.expression,
        maxRuns: input.schedule.maxRuns,
      }
    : {
        ...base,
        execution_type: 'one-time' as const,
        run_at: input.schedule.runAt,
      };
}

export const jobSchedulerV3Provider = defineCapabilityProvider({
  contract: SchedulerV3,
  operations: {
    [SchedulerV3.operations.create.id]: async ({ input, providerId }) => {
      if (!JobPluginDb) {
        throw new Error('Job plugin database is not initialized.');
      }

      const db = JobPluginDb;

      const create = db.transaction(() => {
        const job = createJob(db, draftInputV3(input));

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
        ...summaryV3(providerId, created.resourceId, created.job),
        review: null,
      };
    },
    [SchedulerV3.operations.list.id]: async ({ providerId }) => {
      if (!JobPluginDb) {
        throw new Error('Job plugin database is not initialized.');
      }

      const db = JobPluginDb;

      const jobs = listSchedulerResources(db).flatMap((mapping) => {
        const job = mapping.jobId === null ? null : getJob(db, mapping.jobId);

        return job ? [{ resourceId: mapping.resourceId, job }] : [];
      });

      return {
        schedules: jobs.map(({ resourceId, job }) =>
          summaryV3(providerId, resourceId, job),
        ),
        view: renderJobListComponent({
          command: alias,
          prefix: '/',
          jobs: jobs.map(({ job }) => job),
        }),
      };
    },
    [SchedulerV3.operations.show.id]: async ({ input, providerId }) => {
      if (!JobPluginDb) {
        throw new Error('Job plugin database is not initialized.');
      }

      const mapping = getSchedulerResource(JobPluginDb, input.resourceId);
      const job = mapping?.jobId ? getJob(JobPluginDb, mapping.jobId) : null;

      if (!job) {
        throw new CapabilityResourceNotFoundError(
          SchedulerV3.capability,
          input.resourceId,
        );
      }

      return {
        ...summaryV3(providerId, input.resourceId, job),
        view: renderJobListComponent({
          command: alias,
          prefix: '/',
          jobs: [job],
        }),
      };
    },
    [SchedulerV3.operations['update-task'].id]: async ({
      input,
      providerId,
    }) => {
      if (!JobPluginDb) {
        throw new Error('Job plugin database is not initialized.');
      }

      const db = JobPluginDb;
      const mapping = getSchedulerResource(db, input.resourceId);

      if (!mapping?.jobId) {
        throw new CapabilityResourceNotFoundError(
          SchedulerV3.capability,
          input.resourceId,
        );
      }

      const update = db.transaction(() => {
        const previous = getJob(db, mapping.jobId!);

        if (!previous) {
          throw new CapabilityResourceNotFoundError(
            SchedulerV3.capability,
            input.resourceId,
          );
        }

        updateJobTask(db, previous.id, input.task);

        return updateJobDetails({
          db,
          id: previous.id,
          name: previous.name,
          prompt:
            input.task.type === 'agent-prompt'
              ? input.task.prompt
              : previous.prompt,
          model:
            input.task.type === 'agent-prompt'
              ? (input.task.modelId ?? '')
              : '',
          modelConfigured:
            input.task.type === 'agent-prompt' && input.task.modelId !== null,
          modelSourceId:
            input.task.type === 'agent-prompt'
              ? input.task.modelSourceId
              : null,
          workspaceTarget:
            input.task.type === 'agent-prompt'
              ? input.task.workspaceTarget
              : null,
          stickySession:
            input.task.type === 'agent-prompt'
              ? input.task.stickySession
              : false,
          instructions: previous.instructions,
        });
      });

      const job = update();

      if (!job) {
        throw new CapabilityResourceNotFoundError(
          SchedulerV3.capability,
          input.resourceId,
        );
      }

      return summaryV3(providerId, input.resourceId, job);
    },
  },
});
