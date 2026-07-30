// ---------------------------------------------------------------------------
// plugins/job/handlers.ts — re-exports (handlers live under commands/<name>/handler.ts)
// ---------------------------------------------------------------------------

export type { BaseProps } from './command-context';

export { handleAiCommand } from './commands/ai/handler';
export { handleConfirmCommand } from './commands/confirm/handler';
export { handleDeleteCommand } from './commands/delete/handler';
export { handleDisableCommand } from './commands/disable/handler';
export { handleDiscardCommand } from './commands/discard/handler';
export { handleDraftsCommand } from './commands/drafts/handler';
export { handleEnableCommand } from './commands/enable/handler';
export { handleHistoryCommand } from './commands/history/handler';
export { handleListCommand } from './commands/list/handler';
export { handleLogsCommand } from './commands/logs/handler';
export { handleReviseCommand } from './commands/revise/handler';
export { handleRunCommand } from './commands/run/handler';
export { handleShowCommand } from './commands/show/handler';
export { handleUpdateCommand } from './commands/update/handler';
