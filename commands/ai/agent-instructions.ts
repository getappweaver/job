export function agentInstructions(alias: string): string {
  return `## Job (${alias} tools)

Use \`list\` and \`show\` for read-only inspection.
Use \`create\` to propose a new job draft.

For mutating calls, include \`original_prompt\` at the top level with the user request verbatim.

After create returns a draft, apply it with:
- \`!${alias} confirm <draft_id>\`
- \`!${alias} revise <draft_id> <corrections>\`
- \`!${alias} discard <draft_id>\`
`;
}
