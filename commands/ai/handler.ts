import type { MessageSource } from '@src/messaging';

import type { BaseProps } from '../../command-context';

import { handleJobAi } from './handle-job-ai';

export async function handleAiCommand(
  props: BaseProps & { source: MessageSource; promptTokens: string[] },
): Promise<string> {
  const { prefix, source, ctx, identity, db, promptTokens } = props;

  return handleJobAi({
    args: promptTokens,
    prefix,
    source,
    identity,
    pluginDb: db,
    ctx,
  });
}
