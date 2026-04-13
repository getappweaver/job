import type { BaseProps } from '../../command-context';
import { disableJob } from '../../db';

export function handleDisableCommand(
  props: BaseProps & { idRaw: string | null },
): string {
  const { prefix, alias, db, idRaw } = props;
  const cmd = `${prefix}${alias}`;
  const id = idRaw ? parseInt(idRaw, 10) : NaN;
  const idValid = !Number.isNaN(id);

  if (!idValid) {
    return `Usage: ${cmd} disable <id>`;
  }

  if (disableJob(db, id)) {
    return `Job ${id} disabled.`;
  }

  return `Job not found or already disabled: ${id}`;
}
