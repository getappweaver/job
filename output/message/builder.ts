import type { MessageRepresentation } from './schema';

export function createMessageRepresentation(params: {
  command: string;
  subcommand: string;
  tone: 'info' | 'success' | 'error';
  text: string;
}): MessageRepresentation {
  return {
    kind: 'message',
    version: 1,
    meta: {
      command: params.command,
      subcommand: params.subcommand,
    },
    data: {
      tone: params.tone,
      text: params.text,
    },
  };
}
