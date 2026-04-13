---
direct_hash: 74fac93dfd2d996e5c8b27161ea551898420e6ebca3847fcd5c971d876485ec2
subtree_hash: 0447a0cfdcd87abb0bb59dfed8734045a1edccaf7a203ed0fda4943377fefd67
files:
  adapter.ts: 0ae07ed3a7b728ee367ece4df283d8c636bf0c3452beb3daedd90dab401eab3a
children:
---

# commands/help

## Purpose
Adapter for the help command that generates help text for subcommands. Takes parsed CLI invocation and returns formatted help message or error representation.

## Files
- `adapter.ts` - Help command adapter - builds help subcommand representation from parsed invocation, returns message or error

## Notes
- Entry point is adaptHelpCommand function exported to CLI system
- Uses buildHelpSubcommandRepresentation from local command module
- Returns message via createMessageRepresentation from output module
