import type { WebNodeRoot } from '@src/web/ui-schema';

import type { Job } from '../../../types';

import { renderJobListWithFocus } from '../component';

export type RenderListWebProps = {
  command: string;
  prefix: string;
  jobs: Job[];
  focusedJobId: number | null;
};

export function renderListWeb(params: RenderListWebProps): WebNodeRoot {
  return renderJobListWithFocus(params);
}
