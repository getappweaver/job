---
direct_hash: a32544079f52b9e8e59052fc29818a22579888a1e3f021e53b22fa0386f2eb89
subtree_hash: 5bc7649ce162b76d7e76dca6c6244ee5b8aeda984b02123b13ded34a8e773867
files:
  adapter.ts: 7047102db6f7791da2ea86e7c2e4bd2ffd94fb4b1b7772d1879295e1bf62449b
  definition.ts: c51961243a80cf4314c1e66da2dc55896e30efc9ed57a934556972b366466e09
  handler.ts: e14534377c24d84d4a9b7ffc7d66a67ecef424deeec038c205752dceea75c418
children:
---

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
