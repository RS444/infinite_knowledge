import React from 'react';
import type { Concept } from '../../types/api';
import { SourceReferenceCard } from './SourceReferenceCard';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Target,
  BookOpen,
  Tag,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  X,
  Compass,
  Sparkles,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import './ConceptDetailsPanel.css';

interface ConceptDetailsPanelProps {
  concept: Concept | null;
  topicName?: string;
  isCompleted?: boolean;
  onClose?: () => void;
  onPreviousConcept?: () => void;
  onNextConcept?: () => void;
  onLearnWithAI?: (concept: Concept) => void;
  onToggleCompleted?: (concept: Concept) => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export const ConceptDetailsPanel: React.FC<ConceptDetailsPanelProps> = ({
  concept,
  topicName,
  isCompleted = false,
  onClose,
  onPreviousConcept,
  onNextConcept,
  onLearnWithAI,
  onToggleCompleted,
  hasPrevious = false,
  hasNext = false,
}) => {
  if (!concept) {
    return (
      <div className="concept-empty-state">
        <div className="concept-empty-icon">
          <Compass size={32} />
        </div>
        <h4 className="concept-empty-title">Select a Concept</h4>
        <p className="concept-empty-desc">
          Click any concept in the knowledge tree to review its definition, learning objective, keywords, and exact source references.
        </p>
      </div>
    );
  }

  return (
    <div className="concept-details-card animate-fade-in">
      {/* Header bar with Topic breadcrumb and Close button */}
      <div className="concept-panel-header">
        <div className="concept-panel-topic">
          <span className="topic-crumb-label">Topic</span>
          <span className="topic-crumb-name">{topicName || 'General'}</span>
        </div>

        <div className="concept-panel-actions">
          {onClose && (
            <button
              className="panel-close-btn"
              onClick={onClose}
              aria-label="Close concept details"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="concept-panel-scroll">
        {/* Concept Title & Actions */}
        <div className="concept-title-group">
          <div className="concept-header-top-row">
            <div className="concept-id-tag">Concept #{concept.id}</div>
            {isCompleted && (
              <span className="concept-completed-badge">
                <CheckCircle2 size={12} />
                <span>Completed</span>
              </span>
            )}
          </div>
          <h2 className="concept-title">{concept.name}</h2>

          {/* Dedicated Tutor and Completion Action Bar */}
          <div className="concept-action-strip">
            {onLearnWithAI && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onLearnWithAI(concept)}
                leftIcon={<Sparkles size={14} />}
              >
                Learn with AI
              </Button>
            )}

            {onToggleCompleted && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onToggleCompleted(concept)}
                leftIcon={
                  isCompleted ? (
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  ) : (
                    <Circle size={14} />
                  )
                }
              >
                {isCompleted ? 'Completed' : 'Mark Completed'}
              </Button>
            )}
          </div>
        </div>

        {/* Learning Objective Callout */}
        {concept.learning_objective && (
          <div className="concept-section objective-section">
            <div className="section-label">
              <Target size={14} className="label-icon text-accent" />
              <span>Learning Objective</span>
            </div>
            <div className="objective-box">
              <p className="objective-text">{concept.learning_objective}</p>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="concept-section">
          <div className="section-label">
            <BookOpen size={14} className="label-icon" />
            <span>Concept Summary</span>
          </div>
          <p className="summary-text">{concept.summary}</p>
        </div>

        {/* Keywords */}
        {concept.keywords && concept.keywords.length > 0 && (
          <div className="concept-section">
            <div className="section-label">
              <Tag size={14} className="label-icon" />
              <span>Key Terms & Keywords</span>
            </div>
            <div className="keywords-wrap">
              {concept.keywords.map((kw, i) => (
                <Badge key={i} variant="neutral" size="sm" className="keyword-chip">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Source References */}
        <div className="concept-section">
          <div className="section-label">
            <FileSpreadsheet size={14} className="label-icon" />
            <span>Source Grounding & Citations ({concept.source_refs?.length || 0})</span>
          </div>

          <div className="source-refs-list">
            {concept.source_refs && concept.source_refs.length > 0 ? (
              concept.source_refs.map((ref, idx) => (
                <SourceReferenceCard key={idx} reference={ref} index={idx} />
              ))
            ) : (
              <p className="no-refs-text">No source references registered for this concept.</p>
            )}
          </div>
        </div>
      </div>

      {/* Stepper Footer */}
      {(onPreviousConcept || onNextConcept) && (
        <div className="concept-panel-footer">
          <Button
            variant="secondary"
            size="sm"
            onClick={onPreviousConcept}
            disabled={!hasPrevious}
            leftIcon={<ChevronLeft size={14} />}
          >
            Previous
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onNextConcept}
            disabled={!hasNext}
            rightIcon={<ChevronRight size={14} />}
          >
            Next Concept
          </Button>
        </div>
      )}
    </div>
  );
};
