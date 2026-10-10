import crypto from 'crypto';
import fs from 'fs';
import { Types } from 'mongoose';
import { DocumentModel, ILegalDocument } from '../models/Document.js';

export const calculateFileHash = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
};

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateOf?: Types.ObjectId;
  warning?: string;
}

export const checkForDuplicateDocument = async (
  caseId: Types.ObjectId | string,
  fileHash: string,
  originalFilename: string
): Promise<DuplicateCheckResult> => {
  const existingDoc = await DocumentModel.findOne({
    caseId,
    fileHash,
  });

  if (existingDoc) {
    return {
      isDuplicate: true,
      duplicateOf: existingDoc._id,
      warning: `Identical file already uploaded in this case as "${existingDoc.originalFilename}" (Document ID: ${existingDoc._id}).`,
    };
  }

  // Check if filename matches an existing document even if hash differs
  const sameNameDoc = await DocumentModel.findOne({
    caseId,
    originalFilename,
  });

  if (sameNameDoc) {
    return {
      isDuplicate: false,
      warning: `A document with the same filename "${originalFilename}" already exists in this case. Content hashes differ.`,
    };
  }

  return { isDuplicate: false };
};
