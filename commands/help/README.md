# commands/help

## Purpose
Adapter for the help command that generates help text for subcommands. Takes parsed CLI invocation and returns formatted help message or error representation.

## Files
- `adapter.ts` - Help command adapter - builds help subcommand representation from parsed invocation, returns message or error

## Notes
- Entry point is adaptHelpCommand function exported to CLI system
- Uses buildHelpSubcommandRepresentation from local command module
- Returns message via createMessageRepresentation from output module
