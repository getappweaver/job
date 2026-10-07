# commands

## Purpose
CLI command implementations for job management plugin. Each subdirectory is a separate subcommand (list, run, enable, disable, delete, etc.) with adapter/definition/handler layers.

## Files
- `adapter-util.ts` - Helper to build job reply messages with tone detection

## Notes
- All subcommands follow the same pattern: adapter (CLI entry), definition (spec), handler (logic)
- adapter-util.ts provides shared message formatting for job replies

## Subdirectories
- `ai/` - Natural language job creation via AI agent with interactive draft review
- `confirm/` - Converts pending create draft into scheduled job
- `delete/` - Permanently removes job by ID
- `disable/` - Disables a job by ID
- `discard/` - Deletes pending draft by numeric ID
- `drafts/` - Lists pending job drafts for review
- `enable/` - Activates disabled job, shows next run time
- `help/` - Generates help text for subcommands
- `history/` - Shows recent runs for a job with optional limit
- `list/` - Lists all jobs as markdown table with schedule info
- `revise/` - Revises create draft via AI with correction instructions
- `run/` - Executes job immediately by ID
- `show/` - Displays single job details by ID

## Local modules

- [enable](enable/README.md)
- [disable](disable/README.md)
- [delete](delete/README.md)
- [discard](discard/README.md)
- [drafts](drafts/README.md)
- [show](show/README.md)
- [confirm](confirm/README.md)
- [ai](ai/README.md)
- [list](list/README.md)
- [history](history/README.md)
- [run](run/README.md)
- [revise](revise/README.md)
- [help](help/README.md)
