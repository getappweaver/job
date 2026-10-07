# commands/ai/renderers

## Purpose
Renderer helpers for the job AI draft-review session. Converts the same review text into either a plain text prompt or a richer web prompt depending on the active message source.

## Files
- `web.ts` - Exports `createJobDraftReviewPrompt`, which returns a text prompt for non-web sources and a `draftReviewPrompt` web payload for web sessions.

## Notes
- Used by `commands/ai/session.ts` during interactive AI draft review.
- Bridges core prompt APIs (`createTextPrompt`, `createWebPrompt`) with the shared web widget `draftReviewPrompt`.
- Keeps the review workflow source-aware without duplicating session logic.
