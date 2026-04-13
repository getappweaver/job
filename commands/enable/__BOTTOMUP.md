---
direct_hash: 12e619def359f3a6eb138d2b807af621514d7a42201fb3d243e604c7d3d67c29
subtree_hash: a5bd00d483f936031dbec4890c8887b83101868b44908c8f724dec468ee4aa77
files:
  adapter.ts: fda230d6e82943590ff9454157555419bc257ba48a22dfd1f2742e9a92675726
  definition.ts: 280aed5836a00ffa53cf01117988eeb6854fb93389a13dc93725217828c9f38b
  handler.ts: 5bb05b83106602bdb07857ef98220a523f36a5ac079ce6fce15a2a0df63d8014
children:
---

# commands/enable

## Purpose
The enable subcommand which activates a disabled job by ID. Adapts CLI invocation, validates the job ID, enables it in the database, and reports the next scheduled run.

## Files
- `adapter.ts` - CLI adapter that extracts job ID from parsed arguments and returns formatted reply message via handler
- `definition.ts` - Subcommand schema defining enable command with optional integer id argument and usage example
- `handler.ts` - Business logic: validates job ID, enables job in DB, returns next run time or error message

## Notes
- Job ID is a required integer argument
- Returns error messages for invalid or missing job IDs
