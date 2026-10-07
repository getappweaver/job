# commands/revise

## Purpose
Implements the revise subcommand for revising create drafts via AI agent. Takes a draft ID and correction instructions, generates a revised draft, and returns preview with confirm/discard options.

## Files
- `adapter.ts` - CLI adapter: normalizes arguments, invokes handler, formats job reply message.
- `definition.ts` - Subcommand definition with draftId (integer) and corrections (variadic string) arguments.
- `handler.ts` - Core logic: validates backend/draft, calls AI to generate revised params, stores new draft, deletes old, returns preview.

## Notes
- Requires agent backend (ctx.runAgent) to function
- Replaces old draft with new revised draft, preserving revision history in originalPrompt
- Returns formatted message with new draft preview and usage instructions
