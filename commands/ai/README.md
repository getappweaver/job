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

## Local modules

- [renderers](renderers/README.md)
