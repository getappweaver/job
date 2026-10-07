# drafts

## Purpose
SQLite-based job draft persistence layer for the job plugin. Handles CRUD on job drafts with session-based grouping and Zod-validated input schemas.

## Files
- `index.ts` - Public exports: types, table creation, and all storage functions for external use
- `row-map.ts` - SQLite row → JobDraftRow converter with Zod validation per draft kind
- `schemas.ts` - Zod validator schemas for DraftKind, DeleteDraftInput, and UpdateJobInput
- `storage.ts` - CRUD operations: storeDraft, getDraft, listDrafts, listDraftsBySession, getDraftBySessionIndex, deleteDraft, updateDraftInput, updateDraftEntry plus session ID creation
- `tables.ts` - DDL for job_drafts table with column migration support
- `types.ts` - TypeScript types: CreateDraftEntry, UpdateDraftEntry, DeleteDraftEntry, JobDraftEntry, JobDraftRow, UpdateJobInput

## Notes
- Exports all types and storage functions from index.ts
- Supports create/update/delete draft kinds with schema validation
- Session IDs enable grouping multiple drafts together
