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
  message: string | null;
  error: string | null;
};

function renderUpdateWeb({
  alias,
  job,
  modelChoices,
  message,
  error,
}: RenderUpdateWebProps): WebNodeRoot {
  const modelCatalog =
    job.model && !modelChoices.includes(job.model)
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
          formOptionFieldNames: ['name', 'model', 'prompt', 'instructions'],
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
          el('text', { weight: 'semibold', size: 'sm' }, [text('AI model')]),
          el(
            'textField',
            {
              formFieldName: 'model',
              inputPlaceholder: 'model override (reset = default)',
              value: job.model,
              choices,
              choiceLabels: { reset: 'Clear / reset' },
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

  const result = handleUpdateCommand({
    db: params.db,
    id,
    name: optionString(params.parsed.options.name),
    model: optionString(params.parsed.options.model),
    prompt: optionString(params.parsed.options.prompt),
    instructions: optionString(params.parsed.options.instructions),
  });

  if (params.source !== 'web' || !result.job) {
    return formatTextResult(id, result);
  }

  const modelChoices = await params.ctx.getAvailableModels().catch(() => []);

  return renderUpdateWeb({
    alias: params.alias,
    job: result.job,
    modelChoices,
    message: result.updated ? `Saved job ${id}.` : null,
    error: result.error,
  });
}
