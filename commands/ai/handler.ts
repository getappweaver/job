import type { BaseProps } from '../../command-context';

import { handleJobAi } from './handle-job-ai';

export async function handleAiCommand(
  props: BaseProps & { promptTokens: string[] },
): Promise<string> {
  const { prefix, alias, ctx, identity, db, promptTokens } = props;

  if (!ctx.runAgent) {
    return `${prefix}${alias} ai requires an agent backend. Set backend (e.g. !backend opencode-sdk) and try again.`;
  }

  return handleJobAi({
    args: promptTokens,
    prefix,
    identity,
    pluginDb: db,
    ctx,
  });
}
