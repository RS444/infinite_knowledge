import React, { useState, useEffect } from 'react';
import type { Topic, Concept } from '../../types/api';
import { ConceptNode } from './ConceptNode';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import './TopicNode.css';

interface TopicNodeProps {
  topic: Topic;
  selectedConceptId: number | null;
  completedConceptIds?: Set<number>;
  onSelectConcept: (concept: Concept, topicName: string) => void;
  onLearnWithAI?: (concept: Concept, topicName: string) => void;
  isExpandedDefault?: boolean;
  searchQuery?: string;
  forceExpand?: boolean;
}

export const TopicNode: React.FC<TopicNodeProps> = ({
  topic,
  selectedConceptId,
  completedConceptIds,
  onSelectConcept,
  onLearnWithAI,
  isExpandedDefault = true,
  searchQuery = '',
  forceExpand,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isExpandedDefault);

  // If forceExpand prop changes (e.g. from Expand All / Collapse All buttons)
  useEffect(() => {
    if (forceExpand !== undefined) {
      setIsExpanded(forceExpand);
    }
  }, [forceExpand]);

  // If search matches concepts within this topic, automatically expand it!
  useEffect(() => {
    if (searchQuery.trim()) {
      const hasMatch = topic.concepts.some(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.keywords?.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase())) ||
          c.learning_objective?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (hasMatch) {
        setIsExpanded(true);
      }
    }
  }, [searchQuery, topic.concepts]);

  // Filter concepts if search is present
  const filteredConcepts = searchQuery.trim()
    ? topic.concepts.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.keywords?.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase())) ||
          c.learning_objective?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : topic.concepts;

  // Calculate topic progress based on completed concepts set from DB
  const totalConcepts = topic.concepts.length;
  const completedConceptsCount = completedConceptIds
    ? topic.concepts.filter((c) => completedConceptIds.has(c.id)).length
    : 0;
  const completionPercentage =
    totalConcepts > 0 ? Math.round((completedConceptsCount / totalConcepts) * 100) : 0;

  // If search query is non-empty and no concepts match, don't show the topic
  if (searchQuery.trim() && filteredConcepts.length === 0) {
    return null;
  }

  return (
    <div className="topic-node-group">
      {/* Topic Header Toggle */}
      <div
        className={`topic-header ${isExpanded ? 'is-expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
      >
        <div className="topic-header-left">
          <span className={`topic-chevron ${isExpanded ? 'rotate-open' : ''}`}>
            <ChevronRight size={15} />
          </span>

          <span className="topic-folder-icon">
            {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
          </span>

          <span className="topic-title">{topic.name}</span>
        </div>

        <div className="topic-header-right">
          {/* Topic Progress Bar & Stats */}
          <div
            className="topic-progress-badge"
            title={`${completedConceptsCount} / ${totalConcepts} concepts completed (${completionPercentage}%)`}
          >
            <div className="topic-progress-text">
              <span className="topic-progress-ratio">
                {completedConceptsCount} / {totalConcepts} completed
              </span>
              <span className="topic-progress-percent">{completionPercentage}%</span>
            </div>
            <div className="topic-progress-bar-track" aria-hidden="true">
              <div
                className={`topic-progress-bar-fill ${
                  completionPercentage === 100 ? 'is-all-completed' : ''
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Topic Description if available */}
      {isExpanded && topic.description && (
        <div className="topic-description">{topic.description}</div>
      )}

      {/* Concepts Tree Spine */}
      {isExpanded && (
        <div className="topic-concepts-list animate-fade-in">
          {filteredConcepts.map((concept, index) => {
            const isSelected = selectedConceptId === concept.id;
            const isLast = index === filteredConcepts.length - 1;
            const isCompleted = completedConceptIds?.has(concept.id) ?? false;

            return (
              <ConceptNode
                key={concept.id}
                concept={concept}
                isSelected={isSelected}
                isLast={isLast}
                isCompleted={isCompleted}
                onSelect={(c) => onSelectConcept(c, topic.name)}
                onLearnWithAI={onLearnWithAI ? (c) => onLearnWithAI(c, topic.name) : undefined}
                searchQuery={searchQuery}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
