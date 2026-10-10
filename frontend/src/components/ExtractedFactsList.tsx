import React, { useState } from 'react';
import type { IExtractedFact, IEvidenceCitation } from '../types';
import { FileText, ExternalLink, ShieldCheck } from 'lucide-react';

interface ExtractedFactsListProps {
  facts: IExtractedFact[];
  onSelectCitation: (citation: IEvidenceCitation) => void;
}

export const ExtractedFactsList: React.FC<ExtractedFactsListProps> = ({
  facts,
  onSelectCitation,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(facts.map((f) => f.category)))];

  const filteredFacts =
    selectedCategory === 'All'
      ? facts
      : facts.filter((f) => f.category === selectedCategory);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)' }}>
            Extracted Material Facts ({facts.length})
          </h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
            Structured legal facts grounded with primary document citations
          </p>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn btn-sm ${
                selectedCategory === cat ? 'btn-navy' : 'btn-outline'
              }`}
              style={{ fontSize: '0.74rem', padding: '4px 10px' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredFacts.length === 0 ? (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            border: 'var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--slate-500)',
          }}
        >
          <FileText size={32} style={{ margin: '0 auto 10px', color: 'var(--slate-400)' }} />
          <p style={{ fontSize: '0.88rem', fontWeight: 500 }}>No facts extracted yet</p>
          <p style={{ fontSize: '0.76rem' }}>Run document analysis to extract verified legal facts.</p>
        </div>
      ) : (
        <div className="facts-grid">
          {filteredFacts.map((fact) => (
            <div key={fact.factId} className="fact-card">
              <div>
                <div className="fact-header">
                  <span className="fact-category">{fact.category}</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--color-success-text)',
                      backgroundColor: 'var(--color-success-bg)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ShieldCheck size={12} /> {fact.confidence || 'Verified'}
                  </span>
                </div>
                <p className="fact-statement">{fact.statement}</p>
              </div>

              {/* Source Citation Chip */}
              <div style={{ paddingTop: '10px', borderTop: '1px dashed var(--slate-200)' }}>
                <button
                  className="citation-chip"
                  onClick={() =>
                    onSelectCitation({
                      documentName: fact.sourceDocumentName,
                      pageNumber: fact.sourcePage,
                      verbatimQuote: fact.sourceQuote,
                      category: fact.category,
                    })
                  }
                  title="Click to view verbatim document quote"
                >
                  <FileText size={12} />
                  <span>{fact.sourceDocumentName} (pg {fact.sourcePage || 1})</span>
                  <ExternalLink size={11} style={{ marginLeft: '2px', opacity: 0.7 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
