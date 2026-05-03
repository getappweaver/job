import type { WebNodeRoot } from '@src/web/ui-schema';

import { listJobs } from '../../db';
import type { JobCommandAdapterParams } from '../../types';

import { renderListText } from './renderers/text';
import { renderListWeb } from './renderers/web';

export function adaptListCommand(
  params: JobCommandAdapterParams,
): string | WebNodeRoot {
  const jobs = listJobs(params.db);

  if (params.source === 'web') {
    return renderListWeb({
      command: params.alias,
      prefix: params.prefix,
      jobs,
    });
  }

  return renderListText({
    prefix: params.prefix,
    alias: params.alias,
    jobs,
  });
}
