import type { WebNode, WebNodeRoot, WebTone } from '@src/web/ui-schema';
import { row, stack, textBlock, textNode } from '@src/web/widgets';

import type { Job, JobRunLog, JobRunLogLevel } from '../../../types';

const jobLogsStylesheet = {
  id: 'job-logs',
  cssText: `
.job-logs-root {
  font-family: var(--font-mono, monospace);
}

.job-log-run > .web-tree-item-summary {
  border-bottom: 1px solid var(--color-border);
  padding: 0.25rem 0;
}

.job-log-run > .web-tree-item-summary > .web-node {
  width: 100%;
}

.job-log-entry {
  border-left: 2px solid var(--color-warning);
  background: color-mix(in srgb, var(--color-surface-alt) 94%, transparent);
  padding: 0.35rem 0.5rem;
}

.job-log-entry--success {
  border-left-color: var(--color-success);
}

.job-log-entry--error {
  border-left-color: var(--color-danger);
}

.job-log-message,
.job-log-details-json {
  overflow-wrap: anywhere;
}

.job-log-details > .web-tree-item-summary {
  color: var(--color-text-muted);
  font-size: 0.78rem;
  padding-top: 0.1rem;
}
`,
};

type RunLogGroup = {
  runId: number;
  logs: JobRunLog[];
};

function levelTone(level: JobRunLogLevel): WebTone {
  if (level === 'success') {
    return 'success';
  }

  return level === 'error' ? 'danger' : 'warning';
}

function eventLabel(event: JobRunLog['event']): string {
  return event.replaceAll('_', ' ');
}

function localTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}

function groupLogsByRun(logs: JobRunLog[]): RunLogGroup[] {
  const groups = new Map<number, JobRunLog[]>();

  for (const logEntry of logs) {
    const runLogs = groups.get(logEntry.run_id) ?? [];

    runLogs.push(logEntry);
    groups.set(logEntry.run_id, runLogs);
  }

  return [...groups.entries()]
    .map(([runId, runLogs]) => ({
      runId,
      logs: runLogs,
    }))
    .sort((a, b) => b.runId - a.runId);
}

function detailsNode(logEntry: JobRunLog): WebNode | null {
  if (logEntry.details === null) {
    return null;
  }

  return {
    type: 'element',
    tag: 'treeItem',
    props: {
      className: 'job-log-details',
      defaultExpanded: false,
    },
    summary: textBlock('Details', 'muted'),
    children: [
      {
        type: 'element',
        tag: 'text',
        props: {
          className: 'job-log-details-json',
          size: 'sm',
          tone: 'muted',
          whiteSpace: 'pre-wrap',
        },
        children: [textNode(JSON.stringify(logEntry.details, null, 2))],
      },
    ],
  };
}

function logEntryNode(logEntry: JobRunLog): WebNode {
  const details = detailsNode(logEntry);

  return {
    type: 'element',
    tag: 'stack',
    props: {
      className: `job-log-entry job-log-entry--${logEntry.level}`,
      gap: 'xs',
    },
    children: [
      row(
        [
          {
            type: 'element',
            tag: 'text',
            props: { size: 'sm', tone: 'muted', fill: true },
            children: [textNode(localTimestamp(logEntry.occurred_at))],
          },
          {
            type: 'element',
            tag: 'badge',
            props: {
              label: eventLabel(logEntry.event),
              tone: levelTone(logEntry.level),
              size: 'sm',
            },
          },
        ],
        'xs',
      ),
      {
        type: 'element',
        tag: 'text',
        props: {
          className: 'job-log-message',
          size: 'sm',
          whiteSpace: 'pre-wrap',
        },
        children: [textNode(logEntry.message)],
      },
      ...(details === null ? [] : [details]),
    ],
  };
}

function runStatus(group: RunLogGroup): {
  label: string;
  tone: WebTone;
} {
  const terminal = [...group.logs]
    .reverse()
    .find((logEntry) => logEntry.event === 'run_finished');

  if (!terminal) {
    return { label: 'running', tone: 'warning' };
  }

  return terminal.level === 'success'
    ? { label: 'success', tone: 'success' }
    : { label: 'failed', tone: 'danger' };
}

type RunNodeProps = {
  group: RunLogGroup;
  defaultExpanded: boolean;
};

function runNode({ group, defaultExpanded }: RunNodeProps): WebNode {
  const firstLog = group.logs[0];
  const status = runStatus(group);

  return {
    type: 'element',
    tag: 'treeItem',
    props: {
      className: 'job-log-run',
      defaultExpanded,
    },
    summary: row(
      [
        {
          type: 'element',
          tag: 'text',
          props: { weight: 'semibold', fill: true },
          children: [textNode(`Run #${group.runId}`)],
        },
        {
          type: 'element',
          tag: 'text',
          props: { size: 'sm', tone: 'muted' },
          children: [
            textNode(
              firstLog ? localTimestamp(firstLog.occurred_at) : 'Unknown start',
            ),
          ],
        },
        {
          type: 'element',
          tag: 'badge',
          props: { label: status.label, tone: status.tone, size: 'sm' },
        },
        {
          type: 'element',
          tag: 'badge',
          props: {
            label: `${group.logs.length} ${group.logs.length === 1 ? 'event' : 'events'}`,
            tone: 'muted',
            size: 'sm',
          },
        },
      ],
      'xs',
    ),
    children: [stack(group.logs.map(logEntryNode), 'xs')],
  };
}

type RenderLogsWebProps = {
  alias: string;
  job: Job;
  logs: JobRunLog[];
  runId: number | null;
};

export function renderLogsWeb({
  alias,
  job,
  logs,
  runId,
}: RenderLogsWebProps): WebNodeRoot {
  const groups = groupLogsByRun(logs);

  return {
    kind: 'ui',
    version: 1,
    meta: {
      command: alias,
      subcommand: 'logs',
      arguments: {
        id: job.id,
        ...(runId === null ? {} : { run_id: runId }),
      },
    },
    stylesheets: [jobLogsStylesheet],
    tree: {
      type: 'element',
      tag: 'stack',
      props: { className: 'job-logs-root', gap: 'sm' },
      children: [
        row(
          [
            {
              type: 'element',
              tag: 'text',
              props: { weight: 'semibold', fill: true },
              children: [textNode(job.name)],
            },
            {
              type: 'element',
              tag: 'badge',
              props: {
                label: `${logs.length} ${logs.length === 1 ? 'event' : 'events'}`,
                tone: 'muted',
                size: 'sm',
              },
            },
            {
              type: 'element',
              tag: 'button',
              props: {
                label: 'Refresh',
                action: {
                  type: 'command',
                  command: alias,
                  subcommand: 'logs',
                  arguments: {
                    id: job.id,
                    ...(runId === null ? {} : { run_id: runId }),
                  },
                  options: {},
                  recordInTimeline: false,
                  surface: 'modal',
                  modalTitle: `Job logs: ${job.name}`,
                },
              },
            },
          ],
          'xs',
        ),
        ...(groups.length === 0
          ? [
              textBlock(
                runId === null
                  ? 'No execution logs yet.'
                  : `No execution logs for run #${runId}.`,
                'muted',
              ),
            ]
          : [
              {
                type: 'element' as const,
                tag: 'tree' as const,
                props: { gap: 'xs' as const },
                children: groups.map((group, index) =>
                  runNode({
                    group,
                    defaultExpanded: runId !== null || index === 0,
                  }),
                ),
              },
            ]),
      ],
    },
  };
}
