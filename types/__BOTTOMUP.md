---
direct_hash: 71b66ddce1a27793fb191b6e4257af1c00ff6d177be341ef8259f0e286294a44
subtree_hash: e9179a58d64e041c4641f865e5d43d17a071b39fe7bc18b9729c3e27ac1e2612
files:
  draft.ts: 67c0b3e6de1c64cc5918d550d78cdb0a9f4145e091860132ae7f6d464226fa8e
  index.ts: e8a1ef951b91766a09cc64471dbd06e8970d34762e5b6312e8080095ef6619e2
  job.ts: 297a71c24d8558ea256b437c063224885383936a1baafdc74d2f8ba48d6f106a
children:
---

# types

## Purpose
Zod schemas for job creation drafts and stored jobs in the jobs plugin. Two execution types: cron (recurring with schedule) and one-time (single run at specific time). Drafts omit backend/provider fields (injected at confirm), stored jobs include all fields from DB.

## Files
- `draft.ts` - Input schemas for job creation; cron/one-time variants; prompt schema omits backend fields for injection later
- `index.ts` - Re-exports draft and job types
- `job.ts` - Stored job types from DB; CronJob/OneTimeJob/JobRun types with run history

## Notes
- Cron jobs get session_id set on first run, one-time jobs never have sessions
- JobRun tracks individual executions with status and output
- GetNextRunAtJob is a minimal subset for schedule calculation
