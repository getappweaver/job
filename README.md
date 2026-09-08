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
| `/jobs logs <id> [run-id]` | Show complete chronological execution logs for a job or run |
| `/jobs run <id>` | Run job once now (result stored in job history) |
| `/jobs help` | Show command summary |

In the web Jobs widget, use **Show logs** from a job's ⋮ menu to open its complete execution log in a modal. Newest runs appear first, while events inside each run remain chronological. OpenCode backend status, tool commands, completion output, and backend errors are recorded while a run is active; use **Refresh** to load new events. Messages and structured details are not truncated.

## Drafts

Job creation uses a draft/confirm flow:

- Use `/jobs ai <prompt>` to create a draft (e.g. "send me a brief every day at 8am").
- The bot returns a preview and a Draft ID.
- Use `/jobs confirm <draft_id>` to create the job, or `/jobs revise <draft_id> <corrections>` to have the AI adjust the draft, or `/jobs discard <draft_id>` to cancel.

Structured scheduler capability requests already contain a validated schedule and task, so they create jobs directly without the AI draft flow. `scheduler:v2` additionally supports `plugin-tool` tasks, which execute a validated plugin tool directly without asking an agent to infer or issue the tool call.

## OpenCode tools

When using the OpenCode backend, the agent can use:

- **jobs__list** — List jobs (optionally enabled only). Use this to resolve job IDs before other operations.
- **jobs__show** — Show full details for a job by ID.

Creation and mutation (confirm, revise, discard, enable, disable, delete) are done via the bot commands above, not via tools.

## Engine and scheduling

- **Engine:** The plugin runs a small scheduler every 60 seconds. Agent-prompt jobs use the configured agent; `scheduler:v2` plugin-tool jobs invoke the target tool directly and have no agent or shell-tool timeout in their execution path.
- **Long-running jobs:** A job can have only one active run. Later scheduler ticks skip it while it is running, and manual execution reports that it is already active. Missed cron intervals are skipped; the next run is calculated from completion time.
- **Running a job:** The agent or plugin-tool output is stored in `job_runs`, and the result is sent by Nostr DM and Web Push. Use `/jobs history <id>` for run summaries and `/jobs logs <id>` for timestamped execution and delivery events.
- **Recovery:** Runs left in `running` state after AppWeaver stops are marked as interrupted when the plugin starts again.

## Plugin data

- **Database:** The plugin uses its own SQLite DB at `plugins/jobs/db.sqlite`.
- **Tables:** `jobs`, `job_runs`, `job_run_logs`, and `job_drafts` are stored in that DB, separate from core bot job state. Runs and logs are deleted automatically when their job is deleted.
