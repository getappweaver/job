# job

## Purpose
Job plugin for AppWeaver: scheduled job management with cron/one-time execution, AI-assisted draft creation, a 60s ticker engine, per-job model-source routing, and opt-in sticky sessions.

## Files
- `.gitignore` - Ignores *.sqlite* files in plugin directory
- `adapter.ts` - Main router: parses args, dispatches to subcommand adapters (list, run, ai, etc.), renders CLI output
- `ai.ts` - Re-exports AI tools, schemas, prompts, and openDb for external/CLI access
- `command-context.ts` - Shared BaseProps type for all command handlers (prefix, alias, db, ctx, identity)
- `definition.ts` - CommandDefinition factory combining the plugin's subcommand definitions (ai, drafts, list, run, enable, etc.).
- `engine.ts` - Scheduler: ticks every 60s, runs due jobs via runJob, auto-started in onInit
- `format.ts` - Helpers for formatting job context line and next-run timestamp display
- `handlers.ts` - Re-exports command handlers from commands/*/handler.ts.
- `help.ts` - Generates help text and command definition for CLI display
- `init.ts` - BotPlugin entry: sets context/db, starts ticker, exports handler/helpText/commandDefinition
- `package.json` - AppWeaver plugin identity, compatibility, scheduler capabilities, and dependencies on croner and zod.
- `README.md` - User docs: command table, draft flow, engine behavior, data model
- `reply-tone.ts` - Maps command output text to reply tone: info/success/error
- `runner.ts` - Job executor: resolves inherited or pinned workspace/source/model, runs with a fresh session by default, reuses sticky sessions only on the same workspace/source, and stores results in job_runs

## Notes
- Uses separate SQLite at `plugins/job/db.sqlite`, not the core database.
- All commands follow adapter/definition/handler pattern under commands/ subdirs
- Engine ticks every 60s to run due jobs via ctx.runAgent
- Job execution settings are stored in `jobs`; optional settings inherit current Core defaults, and scheduler v3 exposes source/model/workspace/sticky-session selection while v1/v2 remain supported.

## Subdirectories
- `commands/` - CLI command implementations: each subdir (list, run, ai, etc.) has adapter/definition/handler layers
- `db/` - SQLite CRUD for jobs, job_runs, cron schedule validation via croner, exports CRUD functions
- `drafts/` - Draft persistence: SQLite CRUD on job_drafts table, session-based grouping, Zod-validated schemas
- `types/` - Zod schemas: Job (cron/one-time with full backend fields) and DraftCreate (omits backend, injected at confirm)
