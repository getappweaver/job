# commands/run

## Purpose
Implements the 'run' subcommand to execute a job immediately by ID. Entry point is adapter.ts which parses CLI args and returns formatted output; handler.ts contains core execution logic.

## Files
- `adapter.ts` - CLI adapter: extracts job ID from parsed args, calls handler, wraps result in jobReplyMessage.
- `definition.ts` - Subcommand metadata: defines 'run' name, integer id argument, usage example.
- `handler.ts` - Execution logic: validates ID, fetches job from DB, runs via runner, returns completion or error.

## Notes
- Job ID is required argument; validates existence before running
- Returns completion message with history reference
