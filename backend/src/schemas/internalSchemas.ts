import { z } from 'zod';

export const workflowFailureSchema = z.object({
  reason: z.string().min(1, 'Failure reason is required'),
  details: z.any().optional(),
  phase: z.string().optional(),
});

export type WorkflowFailureInput = z.infer<typeof workflowFailureSchema>;
