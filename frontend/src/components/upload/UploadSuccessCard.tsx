import React from 'react';
import {
  CheckCircle2,
  BookOpen,
  UploadCloud,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../ui/Button';
import type { ProcessDocumentResponse } from '../../types/api';
import './DocumentUploader.css';

interface UploadSuccessCardProps {
  result: ProcessDocumentResponse;
  fileName: string;
  onExploreKnowledgeTree: (subjectId: number) => void;
  onUploadAnother: () => void;
  onViewAllSubjects: () => void;
}

export const UploadSuccessCard: React.FC<UploadSuccessCardProps> = ({
  result,
  fileName,
  onExploreKnowledgeTree,
  onUploadAnother,
  onViewAllSubjects,
}) => {
  const isDuplicate = result.status === 'already_processed' || result.is_duplicate;

  return (
    <div className="upload-success-card animate-fade-in">
      <div className="success-icon-badge">
        <CheckCircle2 size={32} />
      </div>

      <h2 className="success-title">
        {isDuplicate ? 'Document Already Processed' : 'Knowledge Tree Generated!'}
      </h2>

      <p className="success-subtitle">
        {isDuplicate
          ? `"${fileName}" was previously ingested into Subject #${result.subject_id}. Existing knowledge tree retained.`
          : `"${fileName}" has been successfully synthesized into a structured, verifiable knowledge tree.`}
      </p>

      {/* Response Details Box */}
      <div className="response-details-box">
        <div className="response-row">
          <span className="response-key">Subject Name:</span>
          <span className="response-val" style={{ fontWeight: 600 }}>
            {result.subject_name || 'Generated Subject'}
          </span>
        </div>

        <div className="response-row">
          <span className="response-key">Subject Database ID:</span>
          <span className="response-val font-mono">#{result.subject_id}</span>
        </div>

        <div className="response-row">
          <span className="response-key">Topics Discovered:</span>
          <span className="response-val">{result.topic_count} topics</span>
        </div>

        <div className="response-row">
          <span className="response-key">Concepts Extracted:</span>
          <span className="response-val">{result.concept_count} concepts</span>
        </div>

        {result.source_references_saved !== undefined && (
          <div className="response-row">
            <span className="response-key">Grounded Citations:</span>
            <span className="response-val">
              {result.source_references_saved} source references
            </span>
          </div>
        )}

        <div className="response-row">
          <span className="response-key">Ingestion Status:</span>
          <span className="response-badge-status">
            {isDuplicate ? 'SYNCED' : 'COMPLETED'}
          </span>
        </div>
      </div>

      {/* Workflow Guidance Callout */}
      <div className="workflow-guidance-callout">
        <Sparkles size={18} className="guidance-icon" />
        <div>
          <strong>Next Steps:</strong> You can explore the interactive Knowledge Tree, chat with
          the grounded AI Socratic Tutor on individual concepts, or take customized knowledge assessments.
        </div>
      </div>

      {/* Actions */}
      <div className="success-actions">
        <Button
          variant="primary"
          size="md"
          onClick={() => onExploreKnowledgeTree(result.subject_id)}
          rightIcon={<ArrowRight size={16} />}
        >
          Explore Knowledge Tree
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={onUploadAnother}
          leftIcon={<UploadCloud size={16} />}
        >
          Upload Another Document
        </Button>

        <Button
          variant="ghost"
          size="md"
          onClick={onViewAllSubjects}
          leftIcon={<BookOpen size={16} />}
        >
          View All Subjects
        </Button>
      </div>
    </div>
  );
};
