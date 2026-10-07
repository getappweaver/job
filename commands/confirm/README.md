# commands/confirm

## Purpose
Implements the 'confirm' subcommand that converts a pending create draft into an actual scheduled job. Small three-file module: adapter (CLI entrypoint), definition (command spec), handler (core logic).

## Files
- `adapter.ts` - CLI adapter extracts draftId argument, invokes handler, formats reply message
- `definition.ts` - Command spec with optional numeric draftId argument and usage example
- `handler.ts` - Validates draftId, retrieves draft, creates job from draft input, deletes draft, returns job details

## Notes
- Draft must be kind 'create' to be confirmable
- Creates job and deletes draft atomically
- Budget info shown only when present
