import type { WebNodeRoot } from '@src/web/ui-schema';

import type { Job } from '../../../types';

import { renderJobListComponent } from '../component';

export function renderListWeb(params: {
  command: string;
  prefix: string;
  jobs: Job[];
}): WebNodeRoot {
  return renderJobListComponent(params);
}
