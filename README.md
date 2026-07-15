# Jobs plugin (jobs)

Scheduled job management: cron and one-time jobs, drafts, and AI-assisted creation and revision.

**Command:** `/jobs` (alias for the `jobs` plugin)

## Demo

[Interactive Demo](https://getappweaver.com/apps/job-scheduler)

![Schedule a job with AI on mobile](https://getappweaver.com/gifs/file-job-ai-mobile.gif)

## Commands

| Command | Description |
|--------|-------------|
| `/jobs ai <prompt>` | Ask AI to create a job draft from natural language |
| `/jobs drafts` | List pending job drafts |
| `/jobs confirm <draft_id>` | Create a job from a draft |
| `/jobs revise <draft_id> <corrections>` | Ask AI to revise a draft |
| `/jobs discard <draft_id>` | Discard a draft |
| `/jobs list` | List all jobs (table with ID, enabled, schedule, next run, context) |
| `/jobs show <id>` | Show job details |
| `/jobs enable <id>` | Enable a job |
| `/jobs disable <id>` | Disable a job |
| `/jobs delete <id>` | Delete a job |
| `/jobs history <id> [N]` | Show run history for a job (default N=10) |
| `/jobs run <id>` | Run job once now (result stored in job history) |
| `/jobs help` | Show command summary |

## Drafts

Job creation uses a draft/confirm flow:

- Use `/jobs ai <prompt>` to create a draft (e.g. "send me a brief every day at 8am").
- The bot returns a preview and a Draft ID.
- Use `/jobs confirm <draft_id>` to create the job, or `/jobs revise <draft_id> <corrections>` to have the AI adjust the draft, or `/jobs discard <draft_id>` to cancel.

## OpenCode tools

When using the OpenCode backend, the agent can use:

- **jobs__list** — List jobs (optionally enabled only). Use this to resolve job IDs before other operations.
- **jobs__show** — Show full details for a job by ID.

Creation and mutation (confirm, revise, discard, enable, disable, delete) are done via the bot commands above, not via tools.

## Engine and scheduling

- **Engine:** The plugin runs a small scheduler (tick every 60s) that runs due jobs using `runAgent`. The engine is started automatically on first use (e.g. when you run any `/jobs` command). No changes to core `src/` are required.
- **Running a job:** Execution uses the plugin’s `runAgent` only: the job prompt is sent to the agent and the output is stored in `job_runs`. No DM is sent (unlike the core job runner). Use `/jobs history <id>` to see run output.

## Plugin data

- **Database:** The plugin uses its own SQLite DB at `plugins/jobs/db.sqlite`.
- **Tables:** `jobs`, `job_runs`, and `job_drafts` are stored in that DB, separate from core bot job state.
