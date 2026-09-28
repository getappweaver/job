import type { WebNode, WebNodeRoot } from '@src/web/ui-schema';

import type { Job, JobCommandAdapterParams } from '../../types';

import { handleUpdateCommand, type UpdateJobResult } from './handler';

function text(value: string): WebNode {
  return { type: 'text', value };
}

function el(
  tag: Extract<WebNode, { type: 'element' }>['tag'],
  props: Record<string, unknown>,
  children: WebNode[],
): WebNode {
  return { type: 'element', tag, props, children } as WebNode;
}

type RenderUpdateWebProps = {
  alias: string;
  job: Job;
  modelChoices: string[];
  sourceChoices: string[];
  message: string | null;
  error: string | null;
};

function renderUpdateWeb({
  alias,
  job,
  modelChoices,
  sourceChoices,
  message,
  error,
}: RenderUpdateWebProps): WebNodeRoot {
  const modelCatalog =
    job.model_configured && job.model && !modelChoices.includes(job.model)
      ? [job.model, ...modelChoices]
      : modelChoices;

  const choices = ['reset', ...modelCatalog];

  return {
    kind: 'ui',
    version: 1,
    meta: { command: alias, subcommand: 'update', arguments: { id: job.id } },
    tree: el('stack', { gap: 'sm' }, [
      ...(message
        ? [el('text', { tone: 'success', size: 'sm' }, [text(message)])]
        : []),
      ...(error
        ? [el('text', { tone: 'danger', size: 'sm' }, [text(error)])]
        : []),
      el(
        'form',
        {
          className: 'web-form web-form--stacked',
          formOptionFieldNames: [
            'name',
            'modelSource',
            'workspace',
            'model',
            'stickySession',
            'prompt',
            'instructions',
          ],
          action: {
            type: 'command',
            command: alias,
            subcommand: 'update',
            arguments: { id: job.id },
            options: {},
            surface: 'modal',
            modalTitle: `Update job: ${job.name}`,
            recordInTimeline: false,
          },
        },
        [
          el('text', { weight: 'semibold', size: 'sm' }, [text('Name')]),
          el('textField', { formFieldName: 'name', value: job.name }, []),
          el('text', { weight: 'semibold', size: 'sm' }, [
            text('Model source'),
          ]),
          el(
            'textField',
            {
              formFieldName: 'modelSource',
              value: job.model_source_id ?? 'inherit',
              choices: ['inherit', ...sourceChoices],
            },
            [],
          ),
          el('text', { weight: 'semibold', size: 'sm' }, [text('Workspace')]),
          el(
            'textField',
            {
              formFieldName: 'workspace',
              value: job.workspace_target ?? 'inherit',
              choices: ['inherit', 'parent', 'appweaver'],
            },
            [],
          ),
          el('text', { weight: 'semibold', size: 'sm' }, [text('AI model')]),
          el(
            'textField',
            {
              formFieldName: 'model',
              inputPlaceholder: 'model override (reset = default)',
              value: job.model_configured ? job.model : '',
              choices,
              choiceLabels: { reset: 'Clear / reset' },
            },
            [],
          ),
          el('text', { weight: 'semibold', size: 'sm' }, [
            text('Sticky session'),
          ]),
          el(
            'textField',
            {
              formFieldName: 'stickySession',
              value: String(job.sticky_session),
              choices: ['false', 'true'],
            },
            [],
          ),
          el('text', { weight: 'semibold', size: 'sm' }, [text('Prompt')]),
          el(
            'textArea',
            {
              formFieldName: 'prompt',
              inputPlaceholder: 'prompt executed when the job runs',
              value: job.prompt,
              maxRows: 10,
            },
            [],
          ),
          el('text', { weight: 'semibold', size: 'sm' }, [
            text('Execution instructions'),
          ]),
          el(
            'textArea',
            {
              formFieldName: 'instructions',
              inputPlaceholder: 'optional guidance (reset = clear)',
              value: job.instructions ?? '',
              maxRows: 8,
            },
            [],
          ),
          el('row', { className: 'web-form__actions' }, [
            el('button', { label: 'Save', htmlType: 'submit' }, []),
          ]),
        ],
      ),
    ]),
  };
}

function optionString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function formatTextResult(id: number, result: UpdateJobResult): string {
  if (result.error) {
    return result.error;
  }

  return result.updated
    ? `Job ${id} updated.`
    : `Job ${id}: pass at least one field to update.`;
}

export async function adaptUpdateCommand(
  params: JobCommandAdapterParams,
): Promise<string | WebNodeRoot> {
  const id = Number(params.parsed.arguments.id);

  if (!Number.isInteger(id) || id < 1) {
    return `Usage: ${params.prefix}${params.alias} update <id>`;
  }

  const requestedSource = optionString(
    params.parsed.options.modelSource,
  )?.trim();

  if (
    requestedSource &&
    requestedSource !== 'inherit' &&
    requestedSource !== 'reset'
  ) {
    const matches = params.ctx.capabilities
      .listProviders({ name: 'ai-model-source', version: 1 })
      .filter(
        (provider) =>
          provider.providerId === requestedSource ||
          provider.source.alias === requestedSource,
      );

    if (matches.length !== 1) {
      return `Unknown or ambiguous model source: ${requestedSource}`;
    }
  }

  const result = handleUpdateCommand({
    db: params.db,
    id,
    name: optionString(params.parsed.options.name),
    model: optionString(params.parsed.options.model),
    modelSource: optionString(params.parsed.options.modelSource),
    workspace: optionString(params.parsed.options.workspace),
    stickySession: optionString(params.parsed.options.stickySession),
    prompt: optionString(params.parsed.options.prompt),
    instructions: optionString(params.parsed.options.instructions),
  });

  if (params.source !== 'web' || !result.job) {
    return formatTextResult(id, result);
  }

  const modelChoices = await params.ctx.agent
    .getAvailableModels({
      modelSourceId: result.job.model_source_id,
      workspaceTarget: result.job.workspace_target,
    })
    .catch(() => []);

  return renderUpdateWeb({
    alias: params.alias,
    job: result.job,
    modelChoices,
    sourceChoices: params.ctx.capabilities
      .listProviders({ name: 'ai-model-source', version: 1 })
      .map((provider) => provider.source.alias),
    message: result.updated ? `Saved job ${id}.` : null,
    error: result.error,
  });
}
