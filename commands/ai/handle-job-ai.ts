// ---------------------------------------------------------------------------
// plugins/job/commands/ai/handle-job-ai.ts — DM/slash `ai` subcommand
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { PluginContext, PluginIdentity } from '@src/core/plugin';
import type { MessageSource } from '@src/messaging';

import { createDraftSessionId, storeDraft } from '../../drafts';
import type { JobDraftInput } from '../../types';

import { generateCreateWithParams } from './generate';
import { buildJobCreateSystemPrompt } from './prompts';
import { runDraftSessionInteractive } from './session';

export type HandleJobAiProps = {
  args: string[];
  prefix: string;
  source: MessageSource;
  identity: PluginIdentity;
  pluginDb: Database;
  ctx: PluginContext;
};

export async function handleJobAi({
  args,
  prefix,
  source,
  identity,
  pluginDb,
  ctx,
}: HandleJobAiProps): Promise<string> {
  const userPrompt = args.join(' ').trim();
  const alias = identity.alias;

  if (!userPrompt) {
    return `Usage: ${prefix}${alias} ai <natural language request>\nExample: ${prefix}${alias} ai send me a morning brief every day at 8am`;
  }

  const systemPrompt = buildJobCreateSystemPrompt(userPrompt);

  let draftInput: JobDraftInput;

  try {
    draftInput = await generateCreateWithParams({
      systemPrompt,
      agent: ctx.agent,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    return `Failed to generate or validate job parameters: ${msg}`;
  }

  const sessionId = createDraftSessionId();

  storeDraft(pluginDb, {
    sessionId,
    kind: 'create',
    input: draftInput,
    originalPrompt: userPrompt,
  });

  return runDraftSessionInteractive({
    prefix,
    alias,
    db: pluginDb,
    ctx,
    identity,
    sessionId,
    source,
  });
}
