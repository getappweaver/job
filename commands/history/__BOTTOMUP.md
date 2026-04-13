---
direct_hash: 3edf541923d28759e5fe195cb563135d2ea16d16fba5bd1ec38f7487142bf546
subtree_hash: 240da417dd3b4bd5440083d847434dc3111a2034e4c96fa0a483bb44b16421da
files:
  adapter.ts: 034d863a5922ad6c3f76f74396b12e0426006e4d738c77c609e39dcbd49eb7b2
  definition.ts: 0c165f01d10c625396cb8b831b2fd9659c284287c68667915ec13072cf57aec6
  handler.ts: 7a7ef6c4dc5f5cf506e96d90569000771ba02aa57e9d014a192a911c24da1698
children:
---

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
