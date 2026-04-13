---
direct_hash: 22aaf22fea7746520eb58a9c48b6ca4fb9f84ad2c1e4e0bbc8ef6c0b16219ffe
subtree_hash: d7731531984568c72b299cd0d39294c14dced98a0a7828bb0912d4d7f750c97e
files:
  adapter.ts: 025916db03d4f75cb372bed39781caa30cdbfba21ee263e4fc4df0bb32ec6f3e
  definition.ts: 28bad7cf728ccb64be4cbab71d8148e89aa466bbc3db55eb05b2ce288fe618d6
  handler.ts: 2795a09d0742a933b91a8cd32b92f535d93e849c2216f4f837dfd08caa400d8c
children:
---

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
