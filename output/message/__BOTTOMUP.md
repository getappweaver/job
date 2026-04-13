---
direct_hash: cb507dcb772b8c40255a31c1542920b48aa4d95cc845c630320e8a6dd5241d38
subtree_hash: 50bf60d76cc7cbe40c5c3e465e29d0026bff015c982458ba236f434fcd732042
files:
  builder.ts: ed2e62f2de11aaf27c22ec3cebe73c02419c8c52af53c43d573522b43db7634b
  schema.ts: 2c4d325ccfbacf7abb4b6700bd189ec3c3870532d57ac62d485c9161277168c1
children:
  renderers: 2836153cf9920457742ee0adbb16fc73e268fed61000a9ffc3b07191daef8e45
---

# output/message

## Purpose
Message representation system for CLI output with tone-based formatting.

## Files
- `builder.ts` - Factory function that constructs MessageRepresentation from command/subcommand params and tone/text data
- `schema.ts` - Zod schemas for MessageData and MessageRepresentation types with kind discriminator

## Notes
- Tone field supports info, success, and error variants
- Uses Zod for schema validation with createRepresentationSchema

## Subdirectories
- `renderers/` - CLI renderer that returns MessageRepresentation.text unchanged
