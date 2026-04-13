---
direct_hash: cfba09356d6a4b953a28fa0fa54a4d589714748c02664093a1539c95f196eb8c
subtree_hash: 65b8d311e4826a023876a2604e5eb34f0c09d33b23b01023526ae502c4ac45ab
files:
  adapter.ts: 3fd4759ae7accccf0c4c9b8033ab75f79a113789ae10353a8482708bb0b0649b
  definition.ts: 4f022c28202718279e50645f1d09c5e551facd07395c4dddaeb9a37f22fc124f
  handler.ts: c8e03fc0093e00401086c8a88165a7dd6f8b1005d3658203b7fed962fdb326fc
children:
---

# commands/drafts

## Purpose
CLI subcommand for listing pending job drafts. Users can confirm, revise, or discard drafts via other subcommands.

## Files
- `adapter.ts` - CLI adapter - invokes handler and wraps output in jobReplyMessage for display
- `definition.ts` - Command definition with name, summary, examples and empty arguments/options
- `handler.ts` - Handles listDrafts query, formats table rows showing name/schedule/actions

## Notes
- Exports drafts as subcommand under parent job command
- BaseProps provides db, prefix, alias to handler
- listDrafts utility from drafts module
