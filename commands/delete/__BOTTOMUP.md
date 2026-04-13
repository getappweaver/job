---
direct_hash: eacd369fbb6bdd7e81930b2c8e3509e6da9fef539538d32e2add6879b20be32d
subtree_hash: 4b887edebdf9958ddf5b20b92575a4b2fa9f7f5fafa661261524d1f9ed1b4a16
files:
  adapter.ts: ca49a326a1c4e05f8ae6f2d5bf18a8bea2ac5f9615d9a52a5cb2bcbb1c755681
  definition.ts: 9510cce47d0708580d0e84122676c6388ab338977e1b5d7719b27283b014fa2e
  handler.ts: 3f24cf5a11ee35337ace0a77ee02f98780217807dcb0cc3260ab8c951ada1daa
children:
---

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
