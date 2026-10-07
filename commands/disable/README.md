# commands/disable

## Purpose
Implements the /disable subcommand to disable a job by ID. Follows standard subcommand pattern with definition, adapter, and handler layers.

## Files
- `adapter.ts` - CLI adapter: extracts job ID from parsed arguments, calls handler, wraps result in job reply format.
- `definition.ts` - Subcommand definition with optional integer id argument and usage example.
- `handler.ts` - Validates job ID, calls disableJob DB function, returns success or not-found message.
