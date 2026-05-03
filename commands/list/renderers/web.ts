import type { WebAction, WebNode, WebNodeRoot } from '@src/web/ui-schema';
import { row, stack, textBlock, textNode } from '@src/web/widgets';

import { formatContextLine, formatNextRun } from '../../../format';
import type { Job } from '../../../types';

function deleteJobAction(params: {
  command: string;
  jobId: number;
}): WebAction {
  return {
    type: 'command',
    command: params.command,
    subcommand: 'delete',
    arguments: { id: params.jobId },
    options: {},
    recordInTimeline: false,
    refresh: {
      command: params.command,
      subcommand: 'list',
      arguments: {},
      options: {},
    },
  };
}

function setJobEnabledAction(params: {
  command: string;
  jobId: number;
  enabled: boolean;
}): WebAction {
  return {
    type: 'command',
    command: params.command,
    subcommand: params.enabled ? 'enable' : 'disable',
    arguments: { id: params.jobId },
    options: {},
    recordInTimeline: false,
    refresh: listRefresh(params.command),
  };
}

function listRefresh(command: string) {
  return {
    command,
    subcommand: 'list',
    arguments: {},
    options: {},
  };
}

function buildListAiCommandForm(command: string): WebNode {
  return {
    type: 'element',
    tag: 'form',
    props: {
      className: 'web-form web-form--stacked web-form--ai-prompt',
      action: {
        type: 'command',
        command,
        subcommand: 'ai',
        arguments: { prompt: '' },
        options: {},
        recordInTimeline: true,
        refresh: listRefresh(command),
      },
    },
    children: [
      {
        type: 'element',
        tag: 'textArea',
        props: {
          formFieldName: 'prompt',
          inputPlaceholder:
            'Add jobs using a prompt like "Remind me to check email tomorrow at 9am"',
          maxRows: 4,
          storyTargetId: 'job-ai-prompt-text',
        },
      },
      {
        type: 'element',
        tag: 'row',
        props: { className: 'web-form__actions' },
        children: [
          {
            type: 'element',
            tag: 'button',
            props: {
              label: 'Run AI',
              htmlType: 'submit',
              storyTargetId: 'job-ai-prompt-submit',
            },
          },
        ],
      },
    ],
  };
}

function jobScheduleLabel(job: Job): string {
  if (job.execution_type !== 'cron') {
    return `${job.schedule_description} (once)`;
  }

  return job.max_runs != null
    ? `${job.schedule_description} (max ${job.max_runs})`
    : job.schedule_description;
}

function jobCard(params: { command: string; job: Job }): WebNode {
  const { command, job } = params;
  const enabled = Boolean(job.enabled);
  const typeLabel = job.execution_type === 'cron' ? 'cron' : 'one-time';

  return {
    type: 'element',
    tag: 'treeItem',
    props: {
      id: `job-tree-item-${job.id}`,
      defaultExpanded: false,
    },
    summary: row(
      [
        {
          type: 'element',
          tag: 'stack',
          props: { gap: 'xs', fill: true },
          children: [
            row(
              [
                {
                  type: 'element',
                  tag: 'text',
                  props: { weight: 'semibold' },
                  children: [textNode(job.name)],
                },
                {
                  type: 'element',
                  tag: 'text',
                  props: { tone: 'muted', size: 'sm' },
                  children: [textNode(`#${job.id}`)],
                },
              ],
              'xs',
            ),
            row(
              [
                {
                  type: 'element',
                  tag: 'badge',
                  props: {
                    label: enabled ? 'enabled' : 'disabled',
                    tone: enabled ? 'success' : 'muted',
                    size: 'sm',
                  },
                },
                {
                  type: 'element',
                  tag: 'badge',
                  props: { label: typeLabel, tone: 'info', size: 'sm' },
                },
              ],
              'xs',
            ),
          ],
        },
        {
          type: 'element',
          tag: 'overflowMenu',
          props: {
            label: '⋮',
            buttonVariant: 'icon',
          },
          children: [
            {
              type: 'element',
              tag: 'menuItem',
              props: {
                label: enabled ? 'Disable' : 'Enable',
                tone: enabled ? 'warning' : 'success',
                action: setJobEnabledAction({
                  command,
                  jobId: job.id,
                  enabled: !enabled,
                }),
              },
            },
            {
              type: 'element',
              tag: 'menuItem',
              props: {
                label: 'Delete',
                tone: 'danger',
                action: deleteJobAction({ command, jobId: job.id }),
              },
            },
          ],
        },
      ],
      'sm',
    ),
    children: [
      row(
        [
          {
            type: 'element',
            tag: 'stack',
            props: { gap: 'xs', fill: true },
            children: [
              textBlock(`Next: ${formatNextRun(job.next_run_at)}`, 'muted'),
              textBlock(`Schedule: ${jobScheduleLabel(job)}`, 'muted'),
              textBlock(`Context: ${formatContextLine(job)}`, 'muted'),
              textBlock(`Prompt: ${job.prompt}`, 'muted'),
            ],
          },
        ],
        'sm',
      ),
    ],
  };
}

export function renderListWeb(params: {
  command: string;
  prefix: string;
  jobs: Job[];
}): WebNodeRoot {
  return {
    kind: 'ui',
    version: 1,
    meta: { command: params.command, subcommand: 'list' },
    tree: stack([
      buildListAiCommandForm(params.command),
      ...(params.jobs.length === 0
        ? [
            textBlock(
              `No jobs. Use ${params.prefix}${params.command} ai <prompt> to add one.`,
              'muted',
            ),
          ]
        : [
            {
              type: 'element' as const,
              tag: 'tree' as const,
              props: {
                gap: 'xs' as const,
                ui: 'job-tree',
              },
              children: params.jobs.map((job) =>
                jobCard({ command: params.command, job }),
              ),
            },
          ]),
    ]),
  };
}
