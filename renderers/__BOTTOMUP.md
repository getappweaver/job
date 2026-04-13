---
direct_hash: aaa49289c9f2d412d3ad89f75be1351c105247fb367f3352ed328068938ce6cb
subtree_hash: c96f881e03046a581b246c4f94f82ba36c5e47c5925f55b6b1a47783ca6d6fea
files:
  cli.ts: 6a531437829082b5ff3b32b5c428196ffaedc2f438cba666ce8ab314086cc708
children:
---

# renderers

## Purpose
Entry point for CLI rendering. Dispatches between help and message representations based on kind.

## Files
- `cli.ts` - Renderer dispatcher - renders help or message representations based on kind field

## Notes
- Single file handles all CLI output rendering
- Uses switch pattern to route by representation kind
