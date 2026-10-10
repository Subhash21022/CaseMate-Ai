import { Router, Request, Response, NextFunction } from 'express';
import { CaseModel } from '../models/Case.js';
import { DocumentModel } from '../models/Document.js';
import { AnalysisModel } from '../models/Analysis.js';
import { createCaseSchema, caseIdParamSchema } from '../schemas/caseSchemas.js';
import { triggerCaseAnalysis } from '../services/n8nService.js';
import { compileReportData, generateReportPdf } from '../services/reportGenerator.js';

const router = Router();

// GET /api/cases — List cases (filtered by user if authenticated)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter = req.user?.id ? { userId: req.user.id } : {};
    const cases = await CaseModel.find(filter).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: cases,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/cases — Create a case workspace
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedBody = createCaseSchema.parse(req.body);

    const newCase = await CaseModel.create({
      title: validatedBody.title,
      category: validatedBody.category,
      status: 'created',
      userId: req.user?.id,
      documents: [],
    });

    res.status(201).json({
      success: true,
      data: newCase,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/cases/:id — Retrieve case details and status
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = caseIdParamSchema.parse(req.params);

    const caseDoc = await CaseModel.findById(id).populate('analysis');
    if (!caseDoc) {
      res.status(404).json({ success: false, error: 'Case not found' });
      return;
    }

    const docCount = await DocumentModel.countDocuments({ caseId: id });

    res.json({
      success: true,
      data: {
        ...caseDoc.toObject(),
        documentCount: docCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/cases/:id/analyze — Start the analysis workflow
router.post('/:id/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = caseIdParamSchema.parse(req.params);

    const caseDoc = await CaseModel.findById(id);
    if (!caseDoc) {
      res.status(404).json({ success: false, error: 'Case not found' });
      return;
    }

    const docCount = await DocumentModel.countDocuments({ caseId: id });
    if (docCount === 0) {
      res.status(400).json({
        success: false,
        error: 'Cannot start analysis: Case has no uploaded documents. Please upload at least one document first.',
      });
      return;
    }

    // Trigger analysis asynchronously
    const triggerResult = await triggerCaseAnalysis(caseDoc);

    res.json({
      success: true,
      message: triggerResult.message,
      data: {
        caseId: id,
        status: 'processing',
        triggeredVia: triggerResult.triggeredVia,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/cases/:id/timeline — Retrieve verified timeline data
router.get('/:id/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = caseIdParamSchema.parse(req.params);

    const caseDoc = await CaseModel.findById(id);
    if (!caseDoc) {
      res.status(404).json({ success: false, error: 'Case not found' });
      return;
    }

    const analysis = await AnalysisModel.findOne({ caseId: id });
    if (!analysis) {
      res.status(200).json({
        success: true,
        data: {
          timelineEvents: [],
          conflicts: [],
          status: caseDoc.status,
          message: 'Analysis has not yet been executed for this case.',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        caseId: id,
        timelineEvents: analysis.timelineEvents,
        conflicts: analysis.conflicts,
        verificationStatus: analysis.verificationStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/cases/:id/report — Retrieve structured report data
router.get('/:id/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = caseIdParamSchema.parse(req.params);

    const caseDoc = await CaseModel.findById(id);
    if (!caseDoc) {
      res.status(404).json({ success: false, error: 'Case not found' });
      return;
    }

    const documents = await DocumentModel.find({ caseId: id });
    const analysis = await AnalysisModel.findOne({ caseId: id });

    const reportData = compileReportData(caseDoc, documents, analysis);

    res.json({
      success: true,
      data: reportData,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/cases/:id/report.pdf — Download report as PDF
router.get('/:id/report.pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = caseIdParamSchema.parse(req.params);

    const caseDoc = await CaseModel.findById(id);
    if (!caseDoc) {
      res.status(404).json({ success: false, error: 'Case not found' });
      return;
    }

    const documents = await DocumentModel.find({ caseId: id });
    const analysis = await AnalysisModel.findOne({ caseId: id });

    const reportData = compileReportData(caseDoc, documents, analysis);
    const pdfBuffer = await generateReportPdf(reportData);

    const filename = `casemate-report-${caseDoc._id.toString().slice(-6)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

export const caseRoutes = router;
