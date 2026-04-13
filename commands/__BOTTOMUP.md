---
direct_hash: 11b32e869e78b36cd50905edc322b9ee980fab53d9d8bda6a8aff15f6d5af6eb
subtree_hash: 1949aaa6abb42b97e659a51843824cbdaf9f9078c99e5e7056e56e918490f9c6
files:
  adapter-util.ts: 2cc3334a0b897dff7469bae55eda4bd62eaefe8b81c7986dff8e9df559123569
children:
  ai: 3e216d108a11ca20e7b2cd9310184326c5edf9c257a95605016353e05be72f11
  confirm: b8318288163ba7e605b07be2822e27ca86f45f7596f4c89b5805983a3f22fadb
  delete: 4b887edebdf9958ddf5b20b92575a4b2fa9f7f5fafa661261524d1f9ed1b4a16
  disable: daac4e624ad7eeb963246af455524ef2e531743860c82f8a8fd5c59d87eec07f
  discard: 9908a694c2fdd255800d4014b78b09fedfebe1c72ef02d05f8822e68d6398444
  drafts: 65b8d311e4826a023876a2604e5eb34f0c09d33b23b01023526ae502c4ac45ab
  enable: a5bd00d483f936031dbec4890c8887b83101868b44908c8f724dec468ee4aa77
  help: 0447a0cfdcd87abb0bb59dfed8734045a1edccaf7a203ed0fda4943377fefd67
  history: 240da417dd3b4bd5440083d847434dc3111a2034e4c96fa0a483bb44b16421da
  list: ac87dde9807ae85386991c1ef370c7ffed4bee79dcee36109987b4577a5153ec
  revise: d7731531984568c72b299cd0d39294c14dced98a0a7828bb0912d4d7f750c97e
  run: 5bc7649ce162b76d7e76dca6c6244ee5b8aeda984b02123b13ded34a8e773867
  show: 4678d8b941e9a4fa94ebc91423fc177174c29618210e32e74107843c966aace0
---

# commands

## Purpose
CLI command implementations for job management plugin. Each subdirectory is a separate subcommand (list, run, enable, disable, delete, etc.) with adapter/definition/handler layers.

## Files
- `adapter-util.ts` - Helper to build job reply messages with tone detection

## Notes
- All subcommands follow the same pattern: adapter (CLI entry), definition (spec), handler (logic)
- adapter-util.ts provides shared message formatting for job replies

## Subdirectories
- `ai/` - Natural language job creation via AI agent with interactive draft review
- `confirm/` - Converts pending create draft into scheduled job
- `delete/` - Permanently removes job by ID
- `disable/` - Disables a job by ID
- `discard/` - Deletes pending draft by numeric ID
- `drafts/` - Lists pending job drafts for review
- `enable/` - Activates disabled job, shows next run time
- `help/` - Generates help text for subcommands
- `history/` - Shows recent runs for a job with optional limit
- `list/` - Lists all jobs as markdown table with schedule info
- `revise/` - Revises create draft via AI with correction instructions
- `run/` - Executes job immediately by ID
- `show/` - Displays single job details by ID
