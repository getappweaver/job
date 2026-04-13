---
direct_hash: 212e0c0bc483a371fc24e039fd448cbf4e118a237aab99ddd2d2a18953732022
subtree_hash: daac4e624ad7eeb963246af455524ef2e531743860c82f8a8fd5c59d87eec07f
files:
  adapter.ts: 1fc6fd7ca9b163ef4159e7524dc16f05c5e0c144659ef592ce9af1fd3b6613a7
  definition.ts: 8f9f8ad0c58fd5bbb21b7c00996df62de88757da829864567dc6aab4ffff3a45
  handler.ts: 86667d2210aa1f2f23d1b6ef12466f1cdfe84353ab3a4a68d286ca7be9fb642d
children:
---

# commands/disable

## Purpose
Implements the /disable subcommand to disable a job by ID. Follows standard subcommand pattern with definition, adapter, and handler layers.

## Files
- `adapter.ts` - CLI adapter: extracts job ID from parsed arguments, calls handler, wraps result in job reply format.
- `definition.ts` - Subcommand definition with optional integer id argument and usage example.
- `handler.ts` - Validates job ID, calls disableJob DB function, returns success or not-found message.
