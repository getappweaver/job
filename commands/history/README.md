# commands/history

## Purpose
Job history command: displays recent runs for a given job ID, with optional limit (default 10, max 50).

## Files
- `adapter.ts` - CLI adapter: extracts id/limit args, calls handler, wraps result in jobReplyMessage
- `definition.ts` - Subcommand definition with id (optional integer) and limit (optional integer 1-50)
- `handler.ts` - Validates job id, fetches runs, formats as timestamped status lines with duration

## Notes
- Handler returns formatted text directly (not JSON)
- Id is required, limit is optional
- No subcommands
