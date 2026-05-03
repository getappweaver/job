import type { AiDefinition } from '@src/system/ai-definition';

import { agentInstructions } from './commands/ai/agent-instructions';
import { executeTool } from './commands/ai/execute-tool';
import {
  ToolCallSchema,
  type JobToolCall,
  skillDescription,
} from './commands/ai/schemas';
import { openDb } from './db';

// ---------------------------------------------------------------------------
// plugins/job/ai.ts — thin entry for codegen & external imports
// (implementation lives under commands/ai/)
// ---------------------------------------------------------------------------

export type { JobToolCall } from './commands/ai/schemas';
export { ToolCallSchema, skillDescription } from './commands/ai/schemas';

export type { FormatCreateWithPreviewProps } from './commands/ai/format-preview';
export { formatCreateWithPreview } from './commands/ai/format-preview';

export type { GenerateCreateWithParamsProps } from './commands/ai/generate';
export { generateCreateWithParams } from './commands/ai/generate';

export type { HandleJobAiProps } from './commands/ai/handle-job-ai';
export { handleJobAi } from './commands/ai/handle-job-ai';

export {
  buildJobCreateSystemPrompt,
  buildRevisePrompt,
  getCurrentTimeContext,
} from './commands/ai/prompts';

export const aiDefinition = {
  toolCallSchema: ToolCallSchema,
  skillDescription,
  openDb,
  executeTool,
  agentInstructions,
} satisfies AiDefinition<
  typeof ToolCallSchema,
  JobToolCall,
  ReturnType<typeof openDb>
>;
