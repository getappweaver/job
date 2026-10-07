# commands/delete

## Purpose
Delete command implementation for job management. Takes a job ID argument, validates it, and permanently removes the job from the database.

## Files
- `adapter.ts` - CLI adapter - parses job ID from parsed arguments and wraps handler output in job reply format
- `definition.ts` - Command metadata - defines delete subcommand name, arguments (optional integer id), and usage examples
- `handler.ts` - Business logic - validates ID is valid integer, calls deleteJob db function, returns success or not-found message

## Notes
- Part of a CLI plugin system with adapter/definition/handler pattern
- Uses bun:sqlite for database operations
