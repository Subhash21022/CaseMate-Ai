import mongoose, { Schema, Document, Types } from 'mongoose';

export type CaseStatus =
  | 'created'
  | 'documents_uploaded'
  | 'processing'
  | 'human_review_required'
  | 'completed'
  | 'failed';

export interface ICase extends Document {
  _id: Types.ObjectId;
  title: string;
  category?: string;
  status: CaseStatus;
  documents: Types.ObjectId[];
  analysis?: Types.ObjectId;
  failureReason?: string;
  workflowJobId?: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CaseSchema = new Schema<ICase>(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'General Legal-Aid' },
    userId: { type: String, index: true },
    status: {
      type: String,
      enum: [
        'created',
        'documents_uploaded',
        'processing',
        'human_review_required',
        'completed',
        'failed',
      ],
      default: 'created',
      index: true,
    },
    documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    analysis: { type: Schema.Types.ObjectId, ref: 'Analysis' },
    failureReason: { type: String },
    workflowJobId: { type: String },
  },
  {
    timestamps: true,
  }
);

export const CaseModel = mongoose.model<ICase>('Case', CaseSchema);
