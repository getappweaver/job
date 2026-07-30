import type { Database } from 'bun:sqlite';

import { getJob, updateJobDetails } from '../../db';
import type { Job } from '../../types';

type HandleUpdateCommandProps = {
  db: Database;
  id: number;
  name: string | undefined;
  model: string | undefined;
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
