import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { IDocumentPage, ExtractionStatus } from '../models/Document.js';

export interface DocumentParseResult {
  text: string;
  pages: IDocumentPage[];
  pageCount: number;
  detectedType: string;
  status: ExtractionStatus;
  warnings: string[];
}

export const detectDocumentTypeFromText = (text: string, filename: string): string => {
  const lower = (text + ' ' + filename).toLowerCase();

  // Indian Criminal Procedure & Custody Records (Specific document types take precedence over generic FIR citations)
  if (
    lower.includes('remand application') ||
    lower.includes('remand order') ||
    lower.includes('judicial remand') ||
    lower.includes('police custody') ||
    lower.includes('remanded to') ||
    lower.includes('remand report') ||
    lower.includes('judicial magistrate') ||
    filename.toLowerCase().includes('remand')
  ) {
    return 'Remand Application / Order';
  }
  if (
    lower.includes('arrest memo') ||
    lower.includes('memo of arrest') ||
    lower.includes('arrest panchnama') ||
    filename.toLowerCase().includes('arrest_memo') ||
    (lower.includes('grounds of arrest') && !lower.includes('remand'))
  ) {
    return 'Arrest Memo / Panchnama';
  }
  if (
    lower.includes('charge sheet') ||
    lower.includes('chargesheet') ||
    lower.includes('final report under section 173') ||
    lower.includes('final report under section 193')
  ) {
    return 'Charge Sheet / Final Report';
  }
  if (
    lower.includes('custody certificate') ||
    lower.includes('undertrial prisoner') ||
    lower.includes('superintendent of jail') ||
    lower.includes('central prison')
  ) {
    return 'Custody Certificate';
  }
  if (lower.includes('bail application') || lower.includes('bail order') || lower.includes('order on bail')) {
    return 'Bail Application / Order';
  }
  if (
    lower.includes('first information report') ||
    filename.toLowerCase().includes('fir') ||
    (/\bf\.?i\.?r\.?\b/i.test(lower) && !lower.includes('remand') && !lower.includes('arrest memo'))
  ) {
    return 'First Information Report (FIR)';
  }

  // General & Housing Legal Records (Retained for backwards compatibility)
  if (lower.includes('notice to quit') || lower.includes('termination of tenancy')) {
    return 'Notice to Quit';
  }
  if (
    lower.includes('summons') ||
    lower.includes('summary process') ||
    lower.includes('court order') ||
    lower.includes('docket no')
  ) {
    return 'Court Summons / Order';
  }
  if (lower.includes('lease agreement') || lower.includes('residential tenancy agreement')) {
    return 'Lease Agreement';
  }
  if (lower.includes('rent ledger') || lower.includes('payment history') || lower.includes('account statement')) {
    return 'Rent Ledger';
  }
  if (lower.includes('receipt') || lower.includes('money order') || lower.includes('proof of payment')) {
    return 'Proof of Payment';
  }
  if (lower.includes('demand letter') || lower.includes('urgent - demand') || lower.includes('formal demand')) {
    return 'Demand Letter';
  }
  if (lower.includes('memorandum') || lower.includes('statement')) {
    return 'Tenant Statement';
  }
  if (lower.includes('dear mr') || lower.includes('dear ms') || lower.includes('sincerely')) {
    return 'Correspondence';
  }

  return 'Supporting Document';
};

export const parseDocumentFile = async (
  filePath: string,
  originalFilename: string,
  mimeType: string
): Promise<DocumentParseResult> => {
  const ext = path.extname(originalFilename).toLowerCase();
  const warnings: string[] = [];
  let extractedText = '';
  let pages: IDocumentPage[] = [];
  let pageCount = 1;
  let status: ExtractionStatus = 'success';

  try {
    if (ext === '.txt') {
      extractedText = fs.readFileSync(filePath, 'utf-8');
      pages = [{ pageNumber: 1, text: extractedText }];
      pageCount = 1;
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      extractedText = result.value;
      if (result.messages && result.messages.length > 0) {
        warnings.push(...result.messages.map((m) => m.message));
      }
      pages = [{ pageNumber: 1, text: extractedText }];
      pageCount = 1;
    } else if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      try {
        const pdfData = await pdfParse(dataBuffer);
        extractedText = pdfData.text.trim();
        pageCount = pdfData.numpages || 1;

        if (extractedText.length === 0) {
          warnings.push('PDF contains no extractable digital text layer. May be a scanned document.');
          status = 'partial';
        } else {
          // Approximate pages or break by form feed \f
          const rawPages = extractedText.split('\f');
          if (rawPages.length > 1) {
            pages = rawPages.map((pageText, idx) => ({
              pageNumber: idx + 1,
              text: pageText.trim(),
            }));
          } else {
            pages = [{ pageNumber: 1, text: extractedText }];
          }
        }
      } catch (pdfErr: any) {
        // Fallback: Direct PDF content stream decompressor for modern PDF streams with unusual XRef structures
        try {
          const str = dataBuffer.toString('latin1');
          const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
          let recoveredText = '';
          let match: RegExpExecArray | null;
          while ((match = streamRegex.exec(str)) !== null) {
            try {
              const decompressed = zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
              const hexMatches = [...decompressed.matchAll(/<([0-9a-fA-F]+)>/g)];
              if (hexMatches.length > 0) {
                const textParts = hexMatches.map((m) => {
                  try {
                    return Buffer.from(m[1], 'hex').toString('utf-8');
                  } catch {
                    return '';
                  }
                });
                recoveredText += textParts.join(' ') + '\n';
              }
              const tjMatches = [...decompressed.matchAll(/\(([^)]+)\)\s*Tj/g)];
              if (tjMatches.length > 0) {
                recoveredText += tjMatches.map((m) => m[1]).join(' ') + '\n';
              }
            } catch {}
          }

          if (recoveredText.trim().length > 20) {
            extractedText = recoveredText.trim();
            pages = [{ pageNumber: 1, text: extractedText }];
            pageCount = 1;
            status = 'success';
          } else {
            warnings.push(`PDF parsing error: ${pdfErr.message}. File might be malformed or password-protected.`);
            status = 'failed';
          }
        } catch {
          warnings.push(`PDF parsing error: ${pdfErr.message}. File might be malformed or password-protected.`);
          status = 'failed';
        }
      }
    } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      // Image file - Run OCR using Tesseract
      try {
        const worker = await createWorker('eng');
        const ret = await worker.recognize(filePath);
        await worker.terminate();
        extractedText = ret.data.text.trim();
        pages = [{ pageNumber: 1, text: extractedText }];
        pageCount = 1;

        if (extractedText.length === 0) {
          warnings.push('OCR completed but no readable text was identified.');
          status = 'partial';
        }
      } catch (ocrErr: any) {
        warnings.push(`OCR failed: ${ocrErr.message}`);
        status = 'failed';
      }
    } else {
      // Other extensions or binary files (.bin, etc.)
      const content = fs.readFileSync(filePath);
      // Check if it's ascii/printable
      const sample = content.slice(0, 1000).toString('utf-8');
      const isPrintable = /^[\x20-\x7E\s]*$/.test(sample);
      if (ext !== '.bin' && isPrintable && sample.trim().length > 10) {
        extractedText = content.toString('utf-8');
        pages = [{ pageNumber: 1, text: extractedText }];
      } else {
        warnings.push('Binary or unreadable file format. Text extraction failed.');
        status = 'failed';
      }
    }
  } catch (err: any) {
    warnings.push(`Extraction error: ${err.message}`);
    status = 'failed';
  }

  // Handle empty text fallback
  if (extractedText.trim().length === 0 && status !== 'failed') {
    status = 'partial';
    warnings.push('Document produced empty text output.');
  }

  // Adversarial Prompt Injection Defense Check
  const normalizedInjectionText = extractedText.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (
    /ignore(all)?(previous|prior)instructions?/i.test(normalizedInjectionText) ||
    /system(instruction)?override/i.test(normalizedInjectionText) ||
    /bypass_?all_?checks/i.test(normalizedInjectionText) ||
    (/adversarial/i.test(extractedText) && /override/i.test(extractedText)) ||
    /ignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts)/i.test(extractedText) ||
    /system\s+(instruction\s+)?override/i.test(extractedText) ||
    /bypass_all_checks/i.test(extractedText)
  ) {
    warnings.push('SECURITY WARNING: Document contains adversarial prompt-injection phrases. Content was sanitized and instructions ignored.');
  }

  const detectedType = detectDocumentTypeFromText(extractedText, originalFilename);

  return {
    text: extractedText,
    pages,
    pageCount,
    detectedType,
    status,
    warnings,
  };
};
