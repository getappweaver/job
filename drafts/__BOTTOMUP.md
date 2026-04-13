---
direct_hash: c678b7e6f3ee0d625542a22625d024e83e6a580306154037e71ccaf30f4277ef
subtree_hash: 66439b85b030ff445e9874a942d50ac0363422be13bd9f81efff34dfb4272f94
files:
  index.ts: 3b860e07b9f9cc40138a2df6664c9f835b344c9fb74f99460b99774a6c5330d8
  row-map.ts: 6d7c1b015a2bc8f28da08d5395a3c9dfd89dc0f3fd20015a592a61dc45dfcd93
  schemas.ts: f654961ff0f6cb4fb52b766b2512c4d4f621dd3f9633b3cce297d26ed2fc30bd
  storage.ts: 0b9701baef3627e7d4835aae0d4539b5779629023c37ca1822630e4cc453ed8f
  tables.ts: 145f12f619b7fbd756eca8b1ecb41c9f1fd8cc9aa46256eca916c625b2c1d23f
  types.ts: df68ad3c4ab5d38b71655b92f97b4b16257e8d69a9e1f121aea3e6602b8334c1
children:
---

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
