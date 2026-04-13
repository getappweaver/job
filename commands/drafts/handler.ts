import type { BaseProps } from '../../command-context';
import { listDrafts } from '../../drafts';

export function handleDraftsCommand(props: BaseProps): string {
  const { prefix, alias, db } = props;
  const cmd = `${prefix}${alias}`;
  const drafts = listDrafts(db);

  if (drafts.length === 0) {
    return `No pending drafts. Use ${cmd} ai <prompt> to create one.`;
  }

  const lines = drafts.map((d) => {
    const s =
      d.kind === 'create'
        ? d.input.execution_type === 'cron'
          ? d.input.schedule
          : d.input.run_at
        : d.kind === 'update'
          ? d.input.execution_type === 'cron'
            ? d.input.schedule
            : d.input.run_at
          : '(delete)';

    const name =
      d.kind === 'delete'
        ? `(delete #${d.input.id})`
        : d.kind === 'update'
          ? d.input.name
          : d.input.name;

    const desc =
      d.kind === 'delete'
        ? '(delete)'
        : d.kind === 'update'
          ? d.input.schedule_description
          : d.input.schedule_description;

    return `${d.id} | ${name} | ${s} | ${desc}`;
  });

  return `Pending drafts:\n${lines.join('\n')}\n\n${cmd} confirm <id> | ${cmd} revise <id> <corrections> | ${cmd} discard <id>`;
}
