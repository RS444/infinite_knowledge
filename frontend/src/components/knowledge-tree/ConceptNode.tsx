import React from 'react';
import type { Concept } from '../../types/api';
import { CircleDot, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import './ConceptNode.css';

interface ConceptNodeProps {
  concept: Concept;
  isSelected: boolean;
  isLast: boolean;
  isCompleted?: boolean;
  onSelect: (concept: Concept) => void;
  onLearnWithAI?: (concept: Concept) => void;
  searchQuery?: string;
}

export const ConceptNode: React.FC<ConceptNodeProps> = ({
  concept,
  isSelected,
  isLast,
  isCompleted = false,
  onSelect,
  onLearnWithAI,
  searchQuery = '',
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(concept);
    }
  };

  // Helper to highlight matching text if search query is active
  const renderHighlightedName = (name: string, query: string) => {
    if (!query.trim()) return name;
    const index = name.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return name;

    const before = name.substring(0, index);
    const match = name.substring(index, index + query.length);
    const after = name.substring(index + query.length);

    return (
      <>
        {before}
        <mark className="search-highlight">{match}</mark>
        {after}
      </>
    );
  };

  return (
    <div
      className={`concept-node-row ${isSelected ? 'is-selected' : ''} ${
        isCompleted ? 'is-concept-completed' : ''
      } ${isLast ? 'is-last-node' : ''}`}
      onClick={() => onSelect(concept)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Select concept: ${concept.name}${isCompleted ? ' (Completed)' : ''}`}
    >
      {/* Visual Tree Connector */}
      <div className="tree-connector-concept">
        <span className="connector-horizontal" />
        {isCompleted ? (
          <CheckCircle2 size={13} className="concept-bullet is-completed-bullet" />
        ) : (
          <CircleDot size={12} className="concept-bullet" />
        )}
      </div>

      <div className="concept-node-content">
        <div className="concept-node-main">
          <div className="concept-name-wrap">
            <span className="concept-name">
              {renderHighlightedName(concept.name, searchQuery)}
            </span>

            {isCompleted && (
              <span className="completed-mini-tag" title="Concept completed">
                Done
              </span>
            )}
          </div>

          <div className="concept-node-right-actions">
            {concept.source_refs && concept.source_refs.length > 0 && (
              <span
                className="citation-badge"
                title={`${concept.source_refs.length} source reference(s)`}
              >
                <FileText size={10} />
                <span>{concept.source_refs.length}</span>
              </span>
            )}

            {onLearnWithAI && (
              <button
                type="button"
                className="concept-learn-ai-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onLearnWithAI(concept);
                }}
                title={`Open AI Tutor for ${concept.name}`}
              >
                <Sparkles size={11} />
                <span>Learn with AI</span>
              </button>
            )}
          </div>
        </div>

        {/* Keyword preview pills (top 2 keywords) */}
        {concept.keywords && concept.keywords.length > 0 && (
          <div className="concept-node-keywords">
            {concept.keywords.slice(0, 2).map((kw, i) => (
              <span key={i} className="mini-keyword-tag">
                {kw}
              </span>
            ))}
            {concept.keywords.length > 2 && (
              <span className="mini-keyword-more">+{concept.keywords.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
