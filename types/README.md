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
