import React from 'react';
import type { SourceReference } from '../../types/api';
import { FileText, Hash, Layers, Info } from 'lucide-react';
import './SourceReferenceCard.css';

interface SourceReferenceCardProps {
  reference: SourceReference;
  index: number;
}

export const SourceReferenceCard: React.FC<SourceReferenceCardProps> = ({
  reference,
  index,
}) => {
  const charLength = reference.end_char - reference.start_char;

  return (
    <div className="source-ref-card">
      <div className="source-ref-header">
        <div className="source-ref-badge">
          <FileText size={13} />
          <span>Source Chunk #{reference.chunk_index}</span>
        </div>
        <span className="source-ref-num">Citation {index + 1}</span>
      </div>

      <div className="source-ref-grid">
        <div className="source-ref-item">
          <span className="source-ref-label">
            <Layers size={11} /> Document ID
          </span>
          <span className="source-ref-val">Doc #{reference.document_id}</span>
        </div>

        <div className="source-ref-item">
          <span className="source-ref-label">
            <Hash size={11} /> Chunk Index
          </span>
          <span className="source-ref-val">Chunk {reference.chunk_index}</span>
        </div>

        <div className="source-ref-item full-width">
          <span className="source-ref-label">Character Offset Range</span>
          <div className="offset-pill">
            <span className="offset-range">
              [{reference.start_char.toLocaleString()} – {reference.end_char.toLocaleString()}]
            </span>
            <span className="offset-length">({charLength.toLocaleString()} characters)</span>
          </div>
        </div>
      </div>

      <div className="source-ref-note">
        <Info size={11} className="note-icon" />
        <span>
          Points directly to character offsets within extracted document chunk #{reference.chunk_index}.
        </span>
      </div>
    </div>
  );
};
