---
direct_hash: 1428323c35c9bc8510ec5acc3f203619baf97331858b58e76df4def68b925b95
subtree_hash: 4678d8b941e9a4fa94ebc91423fc177174c29618210e32e74107843c966aace0
files:
  adapter.ts: 3ffc00f1679c3358a05af94dac46780429ec7e5f98b909db43bdf0ddc88fbbc8
  definition.ts: 2dd3cb3b93b47bd1320ee0493d9bb16c0b617eb2e9617d837b6b3950808c089d
  handler.ts: 5d5bfab6e65c025402905f2624ea621e8e97b9e57840890abc3ed8c5e80e9828
children:
---

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
