---
direct_hash: d2300d157c7f75ff84cd2d06f9755baf429c784801da1ae57a6f846bb7f5f429
subtree_hash: 9908a694c2fdd255800d4014b78b09fedfebe1c72ef02d05f8822e68d6398444
files:
  adapter.ts: 162a9e2a77c57a1fc02b907af7476320b97894df24b4541d3146d4c63ecaa263
  definition.ts: 5d7760f707971db3862830d5da3d01eb047b944d6d7cbbf9e0bc4561c5aa5d62
  handler.ts: e76a55f5a23178cce4dae955ecf4bbb03c0ebd999032b527d86fdd60f67c80c1
children:
---

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
