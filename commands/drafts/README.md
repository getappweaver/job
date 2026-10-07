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
