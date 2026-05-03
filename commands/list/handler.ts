import type { BaseProps } from '../../command-context';
import { listJobs } from '../../db';

import { renderListText } from './renderers/text';

export function handleListCommand(props: BaseProps): string {
  const { prefix, alias, db } = props;
  const jobs = listJobs(db);

  return renderListText({ prefix, alias, jobs });
}
