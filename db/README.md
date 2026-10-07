# db

## Purpose
Database layer for job scheduler plugin. Handles SQLite operations for jobs and job_runs tables, cron schedule validation via crener, and exports CRUD functions.

## Files
- `cron-schedule.ts` - Cron validation and next run time calculation using croner library
- `index.ts` - Public DB API - re-exports from split modules
- `jobs.ts` - Jobs table CRUD with scheduling fields (create, list, get, delete, enable, disable, due jobs)
- `open.ts` - Opens SQLite database, creates tables on first open
- `row-map.ts` - Maps SQLite rows to Job and JobRun typed objects
- `runs.ts` - Job_runs table CRUD (list, insert, update runs)
- `tables.ts` - DDL for jobs and job_runs tables with indexes

## Notes
- Uses Bun SQLite driver
- Cron validation via croner library
- Public API exported from index.ts
