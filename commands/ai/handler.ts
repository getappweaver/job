import type { MessageSource } from '@src/messaging';

import type { BaseProps } from '../../command-context';

import { handleJobAi } from './handle-job-ai';

export async function handleAiCommand(
  props: BaseProps & { source: MessageSource; promptTokens: string[] },
): Promise<string> {
  const { prefix, alias, source, ctx, identity, db, promptTokens } = props;

  if (!ctx.runAgent) {
    return `${prefix}${alias} ai requires an agent backend. Set backend (e.g. !backend opencode) and try again.`;
  }

  return handleJobAi({
    args: promptTokens,
    prefix,
    source,
    identity,
    pluginDb: db,
    ctx,
  });
}
