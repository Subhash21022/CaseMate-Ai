import mongoose, { Schema, Document as MongooseDocument, Types } from 'mongoose';

export type ExtractionStatus = 'pending' | 'success' | 'partial' | 'failed';

export interface IDocumentPage {
  pageNumber: number;
  text: string;
}

export interface ILegalDocument extends MongooseDocument {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  originalFilename: string;
  detectedDocumentType: string;
  mimeType: string;
  storagePath: string; // Internal safe path, never sent to frontend directly
  storageProvider: 'supabase' | 'local';
  fileHash: string;
  fileSize: number;
  extractedText: string;
  pageCount: number;
  pages: IDocumentPage[];
  extractionStatus: ExtractionStatus;
  warnings: string[];
  isDuplicate: boolean;
  duplicateOf?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<ILegalDocument>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    originalFilename: { type: String, required: true },
    detectedDocumentType: { type: String, default: 'Unknown' },
    mimeType: { type: String, required: true },
    storagePath: { type: String, required: true },
    storageProvider: { type: String, enum: ['supabase', 'local'], default: 'local' },
    fileHash: { type: String, required: true, index: true },
    fileSize: { type: Number, required: true },
    extractedText: { type: String, default: '' },
    pageCount: { type: Number, default: 1 },
    pages: [
      {
        pageNumber: { type: Number, required: true },
        text: { type: String, default: '' },
      },
    ],
    extractionStatus: {
      type: String,
      enum: ['pending', 'success', 'partial', 'failed'],
      default: 'pending',
    },
    warnings: [{ type: String }],
    isDuplicate: { type: Boolean, default: false },
    duplicateOf: { type: Schema.Types.ObjectId, ref: 'Document' },
  },
  {
    timestamps: true,
  }
);

export const DocumentModel = mongoose.model<ILegalDocument>('Document', DocumentSchema);
