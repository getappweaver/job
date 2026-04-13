---
direct_hash: 68c9ba92b745407661a63d8c3662040be43b8394f8bdb1357a14d8d5a3079dbc
subtree_hash: ac87dde9807ae85386991c1ef370c7ffed4bee79dcee36109987b4577a5153ec
files:
  adapter.ts: d79d98fdfeca680f390b88d6a17739aeb20bd95d5b4f1593f13c64c8003c6baa
  definition.ts: 5a75b8f1d8f54fb51d9bfdf1b42568d0e9424782799bdfa3d52d5cebe7014136
  handler.ts: 45f46ee9b552b3776468ee792b8064a114642ce970df1c98c28b46862eaa8db4
children:
---

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
