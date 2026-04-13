---
direct_hash: fdb682445ebecbaf0837636085f1e157e0b7670a6c8ef269dd1e2f94e61be539
subtree_hash: 3e216d108a11ca20e7b2cd9310184326c5edf9c257a95605016353e05be72f11
files:
  adapter.ts: 902a046d87ea13147d057a4e0ffda52867cac8b3b8b1d189c6d606dc622f2061
  agent-instructions.ts: 046df6ef1e47182b07ddd13858e798ba13721341308e0ebb02f61c51f8c51639
  definition.ts: e2b6c20c2602a99a5a102d4e10c81c17cd9850b602ba593233c67c70570e0686
  execute-tool.ts: 26f600d31d68fdf42f9d5de850b2512c396c93b00e7f725b298d96ff074475a9
  format-preview.ts: 8144f94ac4b866b04cd20adf2cac80ffd20871e69cb28081e6f8a47cd53869b4
  generate.ts: 18898dd70043316b5e15ea0b02e5f5840cd505301da4732f23679d28d79f6ba3
  handle-job-ai.ts: 579fa0c03d31355f7d251186106b99af3c15e1852bcec270298d5fe53680eabb
  handler.ts: 124ae0591dfe6653b92846b4f6d33417b7aff1055454997f40851702fbe23f19
  prompts.ts: 40317bb15e04b21c2e5d7be77a95dc8193f476004b2b95feec806475833cc3b3
  schemas.ts: 6b11169e071d57624c832ff325e7a0cc2441136e7a86d7641e6bba2d61f60220
  session.ts: bc73a80f2334e6cafde0969e838af498329d5464568e9dfce9e0b802555c7d9d
children:
---

# commands/ai

## Purpose
Job scheduling AI command module. Generates job drafts from natural language via agent backend, then runs interactive review sessions (accept/revise/discard). Exposes CLI tools: list, show, create.

## Files
- `adapter.ts` - CLI adapter: transforms ai subcommand arguments into prompt tokens and delegates to handler
- `agent-instructions.ts` - Returns markdown instructions for AI agents using job tools (list/show/create/drafts)
- `definition.ts` - Subcommand definition for ai: name, arguments, examples; prompt is variadic string
- `execute-tool.ts` - Executes tool calls: list (job table), show (job detail), create (new draft)
- `format-preview.ts` - Formats JobDraftInput as human-readable preview with draft ID and reply commands
- `generate.ts` - Parses agent model JSON output into JobDraftInput, applies defaults, validates with Zod
- `handle-job-ai.ts` - Main handler: builds system prompt from user request, generates draft, starts session
- `handler.ts` - Entry point: checks for agent backend, calls handleJobAi with prompt tokens
- `prompts.ts` - System prompts for create (cron/one-time) and revise operations with time context
- `schemas.ts` - Zod schemas for JobToolCall: list, show, create with JobDraftPromptInputSchema
- `session.ts` - Interactive draft review workflow: accept/revise/discard/skip/quit actions on drafts

## Notes
- Requires agent backend (ctx.runAgent) for generation
- Drafts stored in plugin DB, reviewed interactively
- Supports cron and one-time job execution types
