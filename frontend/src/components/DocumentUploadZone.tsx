import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, Play, Sparkles } from 'lucide-react';
import type { ILegalDocument } from '../types';

interface DocumentUploadZoneProps {
  documents: ILegalDocument[];
  onUploadFile: (file: File) => Promise<void>;
  onStartAnalysis: () => void;
  isAnalyzing: boolean;
}

export const DocumentUploadZone: React.FC<DocumentUploadZoneProps> = ({
  documents,
  onUploadFile,
  onStartAnalysis,
  isAnalyzing,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setIsUploading(true);
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        await onUploadFile(e.dataTransfer.files[i]);
      }
      setIsUploading(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      for (let i = 0; i < e.target.files.length; i++) {
        await onUploadFile(e.target.files[i]);
      }
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      {/* Upload Drag & Drop Area */}
      <div
        className={`upload-dropzone ${isDragOver ? 'drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.txt"
          style={{ display: 'none' }}
        />
        <div className="upload-icon-circle">
          <UploadCloud size={28} />
        </div>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--slate-900)', marginBottom: '6px' }}>
          {isUploading ? 'Uploading & Parsing Records...' : 'Click to Upload or Drag & Drop Legal Documents'}
        </h4>
        <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', maxWidth: '480px', margin: '0 auto' }}>
          Supports FIRs, Arrest Memos, Magistrate Remand Orders, Charge Sheets, and Bail Rejections (PDF, PNG, JPG, TXT up to 10MB)
        </p>
      </div>

      {/* Document Inventory */}
      <div style={{ marginTop: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-900)' }}>
              Ingested Case Documents ({documents.length})
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
              Deterministic OCR & text extraction completed
            </p>
          </div>

          {documents.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={onStartAnalysis}
              disabled={isAnalyzing}
              style={{ minWidth: '180px' }}
            >
              {isAnalyzing ? (
                <>
                  <Sparkles size={16} className="animate-spin" /> Analyzing Timeline...
                </>
              ) : (
                <>
                  <Play size={16} /> Run Section 479 Review
                </>
              )}
            </button>
          )}
        </div>

        {documents.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              border: '1px dashed var(--slate-300)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--slate-500)',
            }}
          >
            <FileText size={32} style={{ margin: '0 auto 10px', color: 'var(--slate-400)' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>No documents uploaded yet</p>
            <p style={{ fontSize: '0.78rem' }}>Upload case records or load a demo case above to proceed.</p>
          </div>
        ) : (
          <div className="doc-list">
            {documents.map((doc) => (
              <div key={doc._id} className="doc-item">
                <div className="doc-item-left">
                  <div className="doc-icon">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="doc-name">{doc.originalFilename}</span>
                      <span
                        className="badge badge-info"
                        style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                      >
                        {doc.detectedDocumentType || 'Document'}
                      </span>
                    </div>
                    <div className="doc-meta">
                      <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>{doc.pageCount || 1} Page(s)</span>
                      <span>•</span>
                      <span style={{ color: 'var(--color-success-text)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={12} /> Extracted
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {doc.warnings && doc.warnings.length > 0 && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--color-danger-text)',
                        backgroundColor: 'var(--color-danger-bg)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <AlertTriangle size={12} /> {doc.warnings[0]}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--slate-500)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Verified Record
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
