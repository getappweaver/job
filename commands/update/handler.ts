import type { Database } from 'bun:sqlite';

import { getJob, updateJobDetails } from '../../db';
import type { Job } from '../../types';

type HandleUpdateCommandProps = {
  db: Database;
  id: number;
  name: string | undefined;
  model: string | undefined;
  modelSource: string | undefined;
  workspace: string | undefined;
  stickySession: string | undefined;
  prompt: string | undefined;
  instructions: string | undefined;
};

export type UpdateJobResult = {
  job: Job | null;
  updated: boolean;
  error: string | null;
};

export function handleUpdateCommand({
  db,
  id,
  name,
  model,
  modelSource,
  workspace,
  stickySession,
  prompt,
  instructions,
}: HandleUpdateCommandProps): UpdateJobResult {
  const current = getJob(db, id);

  if (!current) {
    return { job: null, updated: false, error: `Job not found: ${id}` };
  }

  const hasUpdates =
    name !== undefined ||
    model !== undefined ||
    modelSource !== undefined ||
    workspace !== undefined ||
    stickySession !== undefined ||
    prompt !== undefined ||
    instructions !== undefined;

  if (!hasUpdates) {
    return { job: current, updated: false, error: null };
  }

  const nextName = name?.trim() ?? current.name;
  const nextPrompt = prompt?.trim() ?? current.prompt;

  if (!nextName) {
    return { job: current, updated: false, error: 'Job name is required.' };
  }

  if (!nextPrompt) {
    return { job: current, updated: false, error: 'Job prompt is required.' };
  }

  if (
    workspace !== undefined &&
    !['inherit', 'parent', 'appweaver'].includes(workspace)
  ) {
    return {
      job: current,
      updated: false,
      error: 'Workspace must be inherit, parent, or appweaver.',
    };
  }

  if (
    stickySession !== undefined &&
    !['true', 'false'].includes(stickySession)
  ) {
    return {
      job: current,
      updated: false,
      error: 'Sticky session must be true or false.',
    };
  }

  const updated = updateJobDetails({
    db,
    id,
    name: nextName,
    model:
      model === undefined
        ? current.model
        : model.trim() === 'reset'
          ? ''
          : model.trim(),
    modelConfigured:
      model === undefined
        ? current.model_configured
        : model.trim() !== 'reset' && model.trim() !== '',
    modelSourceId:
      modelSource === undefined
        ? current.model_source_id
        : modelSource.trim() === 'inherit' || modelSource.trim() === 'reset'
          ? null
          : modelSource.trim(),
    workspaceTarget:
      workspace === undefined
        ? current.workspace_target
        : workspace === 'inherit'
          ? null
          : (workspace as 'parent' | 'appweaver'),
    stickySession:
      stickySession === undefined
        ? current.sticky_session
        : stickySession === 'true',
    prompt: nextPrompt,
    instructions:
      instructions === undefined
        ? current.instructions
        : instructions.trim() === 'reset'
          ? null
          : instructions.trim() || null,
  });

  return updated
    ? { job: updated, updated: true, error: null }
    : { job: null, updated: false, error: `Job not found: ${id}` };
}
