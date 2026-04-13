import type { BaseProps } from '../../command-context';
import { deleteJob } from '../../db';

export function handleDeleteCommand(
  props: BaseProps & { idRaw: string | null },
): string {
  const { prefix, alias, db, idRaw } = props;
  const cmd = `${prefix}${alias}`;
  const id = idRaw ? parseInt(idRaw, 10) : NaN;
  const idValid = !Number.isNaN(id);

  if (!idValid) {
    return `Usage: ${cmd} delete <id>`;
  }

  if (deleteJob(db, id)) {
    return `Job ${id} deleted.`;
  }

  return `Job not found: ${id}`;
}
