import { createMessageRepresentation } from '../output/message/builder';
import { toneForPlainReply } from '../reply-tone';

export function jobReplyMessage(params: {
  alias: string;
  subcommand: string;
  text: string;
}) {
  return createMessageRepresentation({
    command: params.alias,
    subcommand: params.subcommand,
    tone: toneForPlainReply(params.text),
    text: params.text,
  });
}
