// ---------------------------------------------------------------------------
// plugins/job/ai.ts — thin entry for codegen & external imports
// (implementation lives under commands/ai/)
// ---------------------------------------------------------------------------

export type { JobToolCall } from './commands/ai/schemas';
export { ToolCallSchema, skillDescription } from './commands/ai/schemas';

export { agentInstructions } from './commands/ai/agent-instructions';
export { executeTool } from './commands/ai/execute-tool';

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

// Re-export so CLI can open the plugin DB without importing init/bot wiring.
export { openDb } from './db';
