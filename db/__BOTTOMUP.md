---
direct_hash: 717e41132b675bea13d50f961c40e71d111ff4681c1415e0d4646706662f90b0
subtree_hash: 3df04f9fc225eb3f4b0f9219853ef18fb61212c5e85bb4ab959f1114bbad146f
files:
  cron-schedule.ts: 0273c0dfefafde61d2a4914ea9d9aace2dba0979f73d6ad06726277c0b7febfd
  index.ts: 1ef804e631a2f9fbe20cd03c7da126ec1e4a3ee5197e089a27424de89c85f90c
  jobs.ts: d7569d10e49e6d463ba7030d86fe40a4bf88360b7ec14ff4feafdb58196482e6
  open.ts: 06bc9cdde48374ae8afa9866f15b445565a977f2a9013f93b24f9e7033609f99
  row-map.ts: 90e6593f7cfb4b1a28cc7b8497f8a209a95f7b59722c650e2c6916122eed923b
  runs.ts: 69026500528733300cd0fe40a228cca48ea423a350593811835654e092c9e0e3
  tables.ts: 278e717a972553df6e16be55b0591ce74dc8b2a183ae026ba08625770ee8db49
children:
---

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
