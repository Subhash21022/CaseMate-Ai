import { z } from 'zod';
import mongoose from 'mongoose';

export const createCaseSchema = z.object({
  title: z.string().min(3, 'Case title must be at least 3 characters long').max(200),
  category: z.string().optional().default('General Legal-Aid'),
});

export const caseIdParamSchema = z.object({
  id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid case ID format',
  }),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
