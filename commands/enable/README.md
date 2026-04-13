# commands/enable

## Purpose
The enable subcommand which activates a disabled job by ID. Adapts CLI invocation, validates the job ID, enables it in the database, and reports the next scheduled run.

## Files
- `adapter.ts` - CLI adapter that extracts job ID from parsed arguments and returns formatted reply message via handler
- `definition.ts` - Subcommand schema defining enable command with optional integer id argument and usage example
- `handler.ts` - Business logic: validates job ID, enables job in DB, returns next run time or error message

## Notes
- Job ID is an optional integer argument; if omitted, shows usage hint
- Returns error messages for invalid or missing job IDs