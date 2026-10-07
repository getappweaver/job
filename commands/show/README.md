# commands/show

## Purpose
CLI subcommand to display details of a single scheduled job by ID.

## Files
- `adapter.ts` - CLI adapter that parses id argument, calls handler, wraps response in job reply format
- `definition.ts` - Subcommand definition for 'show' with optional integer id argument
- `handler.ts` - Retrieves job from DB by ID and formats as labeled key-value table

## Notes
- Displays job metadata including schedule, prompt preview, backend/provider/model, and budget
- Validates ID is a number before querying database
- Returns usage hint if no ID provided
