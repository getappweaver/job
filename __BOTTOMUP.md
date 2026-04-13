---
direct_hash: f8b17456997335968891d54dc755bd391dd60161951e9f8e3644373d0df86c48
subtree_hash: a81314c9f66baba86034b8744407fdb8fdb9c0deccb6e2305ffb69dd45415463
files:
  .gitignore: a361ccf868f2997d62a455e3c2355432ad932b66b8f4a722552cb00462ebab41
  adapter.ts: 84c4f15d44e31af896c4785744a40b2423542ba4e9c71bf058b014a5a41b5043
  ai.ts: dc00f5c8674f70ee342f9d75f06c6c1a6d05eb4f6305aec5988180242a90d782
  command-context.ts: a6a7622998cc709153e9343c10c6be4f2f18a84d2cacce53a8fb29c8d9e5091c
  definition.ts: e878dc720933acb5ffd11bea946e2225f8cb724f89bff85efda8faefc28b8734
  engine.ts: e1a118d35f98c4ffdd0b96555303992d17ab41d25fc18456ad10347b31e6ccad
  format.ts: 4d19b8ac743268b8ff9a77f6f9356e02bd4f6c77655588a4e70f4a0386c7e8c7
  handlers.ts: 7aa699a106cd1ca083252b15a5bbe7e83213d0077784722ea64ccb712985dcfd
  help.ts: 8f64c9e04a4d6ee424762ff9ceeb61005be3628bc2ee90bd000d6ad4aee5996f
  init.ts: e6227da99e20dd8a7197e6a915692321fa3b959454f5b95da63f495fdf8aa68a
  package.json: 77e27665383d18f04c54705b5d392d6259a6c974869848d089092a915580cca8
  README.md: 5bace5d83231aa5171c11cba47f929d4997b4474711e0d3543db0c9fc79d4ef5
  reply-tone.ts: 712e3c980286bb84debf7bd47de74de7e93bb1340fce02f3af8810e089e378a3
  runner.ts: 9f4dd3a0e248fcc3df8c80e206fd4b558ba3dcbbbcf470dde84373f689857bdd
children:
  commands: 1949aaa6abb42b97e659a51843824cbdaf9f9078c99e5e7056e56e918490f9c6
  db: 3df04f9fc225eb3f4b0f9219853ef18fb61212c5e85bb4ab959f1114bbad146f
  drafts: 66439b85b030ff445e9874a942d50ac0363422be13bd9f81efff34dfb4272f94
  output: f6387f859b8bbed2b754bb4fef8e0e80d8ad28526cf8ca9413535ce4c8475916
  renderers: c96f881e03046a581b246c4f94f82ba36c5e47c5925f55b6b1a47783ca6d6fea
  types: e9179a58d64e041c4641f865e5d43d17a071b39fe7bc18b9729c3e27ac1e2612
---

# job

## Purpose
Job plugin for dm-bot: scheduled job management with cron/one-time execution, AI-assisted draft creation, and a 60s ticker engine.

## Files
- `.gitignore` - Ignores *.sqlite* files in plugin directory
- `adapter.ts` - Main router: parses args, dispatches to subcommand adapters (list, run, ai, etc.), renders CLI output
- `ai.ts` - Re-exports AI tools, schemas, prompts, and openDb for external/CLI access
- `command-context.ts` - Shared BaseProps type for all command handlers (prefix, alias, db, ctx, identity)
- `definition.ts` - CommandDefinition factory combining all 13 subcommand definitions (ai, drafts, list, run, enable, etc.)
- `engine.ts` - Scheduler: ticks every 60s, runs due jobs via runJob, auto-started in onInit
- `format.ts` - Helpers for formatting job context line and next-run timestamp display
- `handlers.ts` - Re-exports all 13 command handlers from commands/*/handler.ts
- `help.ts` - Generates help text and command definition for CLI display
- `init.ts` - BotPlugin entry: sets context/db, starts ticker, exports handler/helpText/commandDefinition
- `package.json` - Plugin manifest: dm-bot-job-plugin v2.0.1, depends on croner and zod
- `README.md` - User docs: command table, draft flow, engine behavior, data model
- `reply-tone.ts` - Maps command output text to reply tone: info/success/error
- `runner.ts` - Job executor: builds backend from job row, runs via runAgent, stores result in job_runs, disables one-time jobs after run

## Notes
- Uses separate SQLite at plugins/jobs/db.sqlite, not core bot DB
- All commands follow adapter/definition/handler pattern under commands/ subdirs
- Engine ticks every 60s to run due jobs via ctx.runAgent

## Subdirectories
- `commands/` - CLI command implementations: each subdir (list, run, ai, etc.) has adapter/definition/handler layers
- `db/` - SQLite CRUD for jobs, job_runs, cron schedule validation via croner, exports CRUD functions
- `drafts/` - Draft persistence: SQLite CRUD on job_drafts table, session-based grouping, Zod-validated schemas
- `output/` - Container for output/message subdirectory (renderers consume this)
- `renderers/` - CLI rendering entry: dispatches between help and message representations by kind
- `types/` - Zod schemas: Job (cron/one-time with full backend fields) and DraftCreate (omits backend, injected at confirm)
