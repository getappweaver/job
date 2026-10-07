# commands/list

## Purpose
Implements the 'list' subcommand for the job plugin. Retrieves all jobs from the database and formats them as a markdown table with id, name, enabled status, schedule, next run time, and context.

## Files
- `adapter.ts` - Adapter bridging CLI invocation to handler, returns jobReplyMessage with formatted list output.
- `definition.ts` - Declares the subcommand definition: name 'list', summary, aliases, arguments, options, examples.
- `handler.ts` - Core logic: queries all jobs from DB, formats each as a block with id, enabled, schedule, next_run, context fields. Returns empty message if no jobs exist.

## Notes
- Part of the job scheduling plugin commands
- No subdirectories in this command module
- Handler uses db.listJobs() which is imported from../../db
