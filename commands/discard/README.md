# commands/discard

## Purpose
Implements the /discard subcommand for deleting pending drafts by numeric ID.

## Files
- `adapter.ts` - CLI adapter that parses draftId argument, calls handler, wraps response
- `definition.ts` - Command definition with optional integer draftId argument
- `handler.ts` - Validates and deletes draft by ID, returns success/error message

## Notes
- Draft ID is required and must be numeric
- Uses deleteDraft from drafts module for persistence
