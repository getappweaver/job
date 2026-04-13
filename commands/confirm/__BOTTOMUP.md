---
direct_hash: d1709345c4856b68ab2828c40e5804fa4af0cc60af93ab6ef7a0610f06fb66e0
subtree_hash: b8318288163ba7e605b07be2822e27ca86f45f7596f4c89b5805983a3f22fadb
files:
  adapter.ts: 1a5fa607dd706f422779217d4e0cf965269eea4ad4e1052832cc6fac7b201d39
  definition.ts: c0e033b5bc86228e525ae71bb54e5ba1302576df1b07a193fe1d6e1c7e2ba000
  handler.ts: 8c0233684719fdbe5fc6b608f95e4ef8a863f5486043f7b58df60c3dbbd4bc71
children:
---

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
