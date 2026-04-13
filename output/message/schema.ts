import { z } from 'zod';

import { createRepresentationSchema } from '@src/system/representation';

export const MessageDataSchema = z.object({
  tone: z.enum(['info', 'success', 'error']),
  text: z.string().min(1),
});

export const MessageRepresentationSchema = createRepresentationSchema(
  MessageDataSchema,
).extend({
  kind: z.literal('message'),
});

export type MessageRepresentation = z.infer<typeof MessageRepresentationSchema>;
