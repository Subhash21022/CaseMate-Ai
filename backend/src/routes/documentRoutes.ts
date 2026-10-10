import { Router, Request, Response, NextFunction } from 'express';
import { CaseModel } from '../models/Case.js';
import { DocumentModel } from '../models/Document.js';
import { caseIdParamSchema } from '../schemas/caseSchemas.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { calculateFileHash, checkForDuplicateDocument } from '../services/duplicateDetector.js';
import { parseDocumentFile } from '../services/documentParser.js';

const router = Router({ mergeParams: true });

// POST /api/cases/:id/documents — Upload a document
router.post(
  '/',
  uploadMiddleware.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = caseIdParamSchema.parse(req.params);

      const caseDoc = await CaseModel.findById(id);
      if (!caseDoc) {
        res.status(404).json({ success: false, error: 'Case not found' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      const filePath = req.file.path;
      const originalFilename = req.file.originalname;
      const mimeType = req.file.mimetype;
      const fileSize = req.file.size;

      // 1. Calculate file hash for integrity and duplicate detection
      const fileHash = await calculateFileHash(filePath);

      // 2. Check for duplicate document
      const dupCheck = await checkForDuplicateDocument(id, fileHash, originalFilename);

      // 3. Extract text and page metadata
      const parseResult = await parseDocumentFile(filePath, originalFilename, mimeType);

      const warnings = [...parseResult.warnings];
      if (dupCheck.warning) {
        warnings.push(dupCheck.warning);
      }

      // 4. Save Document record
      const legalDoc = await DocumentModel.create({
        caseId: caseDoc._id,
        originalFilename,
        detectedDocumentType: parseResult.detectedType,
        mimeType,
        storagePath: filePath, // Kept internal, not returned in public response
        fileHash,
        fileSize,
        extractedText: parseResult.text,
        pageCount: parseResult.pageCount,
        pages: parseResult.pages,
        extractionStatus: parseResult.status,
        warnings,
        isDuplicate: dupCheck.isDuplicate,
        duplicateOf: dupCheck.duplicateOf,
      });

      // 5. Link to Case and update case status
      caseDoc.documents.push(legalDoc._id);
      if (caseDoc.status === 'created') {
        caseDoc.status = 'documents_uploaded';
      }
      await caseDoc.save();

      // 6. Return safe document response (without storagePath)
      res.status(201).json({
        success: true,
        data: {
          _id: legalDoc._id,
          caseId: legalDoc.caseId,
          originalFilename: legalDoc.originalFilename,
          detectedDocumentType: legalDoc.detectedDocumentType,
          mimeType: legalDoc.mimeType,
          fileSize: legalDoc.fileSize,
          pageCount: legalDoc.pageCount,
          extractionStatus: legalDoc.extractionStatus,
          warnings: legalDoc.warnings,
          isDuplicate: legalDoc.isDuplicate,
          createdAt: legalDoc.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/cases/:id/documents — List associated documents
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = caseIdParamSchema.parse(req.params);

    const caseDoc = await CaseModel.findById(id);
    if (!caseDoc) {
      res.status(404).json({ success: false, error: 'Case not found' });
      return;
    }

    const docs = await DocumentModel.find({ caseId: id }).select(
      '-storagePath -extractedText -pages'
    );

    res.json({
      success: true,
      data: docs,
    });
  } catch (err) {
    next(err);
  }
});

export const documentRoutes = router;
