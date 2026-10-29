import React from 'react';
import { Sparkles, Loader2, Check, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import './DocumentUploader.css';

interface KnowledgeGenerationViewProps {
  fileName: string;
  subjectName?: string;
  stage?: number; // 1 to 4
  onCancel?: () => void;
}

interface IngestionStage {
  number: number;
  name: string;
  desc: string;
}

const STAGES: IngestionStage[] = [
  {
    number: 1,
    name: 'Document Text Extraction & Normalization',
    desc: 'Extracting clean text and computing byte offsets from the source material.',
  },
  {
    number: 2,
    name: 'Local Ollama LLM Knowledge Extraction (Qwen 3)',
    desc: 'Extracting academic topics, concepts, summaries, and learning objectives in-memory.',
  },
  {
    number: 3,
    name: 'Topic Deduplication & Knowledge Merging',
    desc: 'Merging multi-chunk concepts while preserving verifiable chunk citations.',
  },
  {
    number: 4,
    name: 'Schema Verification & PostgreSQL Ingestion',
    desc: 'Validating hierarchy and committing Subject, Topic, Concept, and SourceReference rows.',
  },
];

export const KnowledgeGenerationView: React.FC<KnowledgeGenerationViewProps> = ({
  fileName,
  subjectName,
  stage = 2,
  onCancel,
}) => {
  return (
    <div className="uploader-container animate-fade-in">
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px 28px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Pulsing AI Icon Badge */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: 'var(--accent-50)',
            color: 'var(--accent-600)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            position: 'relative',
          }}
        >
          <Sparkles size={28} className="animate-spin-slow" />
        </div>

        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 6,
          }}
        >
          Generating Knowledge Tree
        </h2>

        <p
          style={{
            fontSize: 13.5,
            color: 'var(--text-secondary)',
            maxWidth: 500,
            margin: '0 auto 24px',
            lineHeight: 1.45,
          }}
        >
          Synthesizing <strong>{fileName}</strong>
          {subjectName ? ` into "${subjectName}"` : ''} via on-device LLM inference.
        </p>

        {/* Ingestion Stages Box */}
        <div className="ingestion-stages-box">
          <div className="stages-title">Pipeline Execution Lifecycle</div>
          <div className="stages-list">
            {STAGES.map((s) => {
              const isComplete = stage > s.number;
              const isCurrent = stage === s.number;

              return (
                <div key={s.number} className="stage-row">
                  <div
                    className={`stage-indicator ${
                      isComplete
                        ? 'stage-complete'
                        : isCurrent
                        ? 'stage-current'
                        : 'stage-pending'
                    }`}
                    style={
                      isCurrent
                        ? {
                            backgroundColor: 'var(--accent-50)',
                            color: 'var(--accent-600)',
                            borderColor: 'var(--accent-500)',
                          }
                        : undefined
                    }
                  >
                    {isComplete ? (
                      <Check size={12} strokeWidth={3} />
                    ) : isCurrent ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      s.number
                    )}
                  </div>

                  <div className="stage-meta">
                    <div
                      className="stage-name"
                      style={
                        isCurrent
                          ? { color: 'var(--accent-600)', fontWeight: 700 }
                          : undefined
                      }
                    >
                      {s.name}
                    </div>
                    <div className="stage-desc">{s.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Local LLM Notice Callout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '12px 16px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'left',
            fontSize: 12.5,
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
            marginBottom: 24,
          }}
        >
          <Clock size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent-600)' }} />
          <div>
            <strong>Local LLM Notice:</strong> Knowledge extraction runs 100% locally on your machine via Ollama.
            Depending on document length (number of chunks) and GPU capacity, processing typically takes between
            <strong> 1 to 3 minutes</strong>. Please keep this tab open while generation is in progress.
          </div>
        </div>

        {onCancel && (
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel Generation
          </Button>
        )}
      </div>
    </div>
  );
};
