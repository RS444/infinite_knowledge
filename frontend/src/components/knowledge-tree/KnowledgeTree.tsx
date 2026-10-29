import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { KnowledgeTreeResponse, Concept, SubjectProgressResponse } from '../../types/api';
import { TopicNode } from './TopicNode';
import { TreeFilter } from './TreeFilter';
import { ConceptDetailsPanel } from '../concept-details/ConceptDetailsPanel';
import { InteractiveTutorModal } from '../tutor/InteractiveTutorModal';
import { getSubjectProgress, setConceptProgress } from '../../api/tutor';
import { Skeleton } from '../ui/Skeleton';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  Layers,
  BookMarked,
  RotateCcw,
  Sparkles,
  Inbox,
  CheckCircle2,
} from 'lucide-react';
import { formatSubjectTitle } from '../../utils/subjectFormat';
import './KnowledgeTree.css';

interface KnowledgeTreeProps {
  data: KnowledgeTreeResponse | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  initialConceptId?: number | null;
}

export const KnowledgeTree: React.FC<KnowledgeTreeProps> = ({
  data,
  isLoading,
  error,
  onRetry,
  initialConceptId,
}) => {
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [activeTopicName, setActiveTopicName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [forceExpand, setForceExpand] = useState<boolean | undefined>(undefined);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState<boolean>(false);

  // Persistent learning progress state from PostgreSQL
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgressResponse | null>(null);
  const [completedConceptIds, setCompletedConceptIds] = useState<Set<number>>(new Set());

  // Interactive AI Tutor modal state
  const [tutorOpen, setTutorOpen] = useState<boolean>(false);
  const [tutorConcept, setTutorConcept] = useState<Concept | null>(null);
  const [tutorTopicName, setTutorTopicName] = useState<string>('');

  // Fetch subject progress from database
  const refreshProgress = useCallback(async () => {
    if (!data?.subject.id) return;
    try {
      const prog = await getSubjectProgress(data.subject.id);
      setSubjectProgress(prog);
      setCompletedConceptIds(new Set(prog.completed_concept_ids));
    } catch (err) {
      console.error('Failed to load subject progress:', err);
    }
  }, [data?.subject.id]);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  // Flatten concepts across all topics for sequential Prev / Next traversal
  const flattenedConcepts = useMemo(() => {
    if (!data?.topics) return [];
    const list: { concept: Concept; topicName: string }[] = [];
    data.topics.forEach((t) => {
      t.concepts.forEach((c) => {
        list.push({ concept: c, topicName: t.name });
      });
    });
    return list;
  }, [data]);

  // Set initial selected concept once data loads
  useEffect(() => {
    if (flattenedConcepts.length > 0) {
      if (initialConceptId) {
        const found = flattenedConcepts.find((item) => item.concept.id === initialConceptId);
        if (found) {
          setSelectedConcept(found.concept);
          setActiveTopicName(found.topicName);
          return;
        }
      }
      // If none selected yet, select the very first concept by default for desktop preview
      if (!selectedConcept) {
        setSelectedConcept(flattenedConcepts[0].concept);
        setActiveTopicName(flattenedConcepts[0].topicName);
      }
    }
  }, [flattenedConcepts, initialConceptId, selectedConcept]);

  // Calculate current concept index for Next/Prev
  const currentIndex = useMemo(() => {
    if (!selectedConcept) return -1;
    return flattenedConcepts.findIndex((item) => item.concept.id === selectedConcept.id);
  }, [selectedConcept, flattenedConcepts]);

  const handleSelectConcept = (concept: Concept, topicName: string) => {
    setSelectedConcept(concept);
    setActiveTopicName(topicName);
    setMobileDetailsOpen(true);
  };

  const handleOpenTutor = (concept: Concept, topicName?: string) => {
    setTutorConcept(concept);
    setTutorTopicName(topicName || activeTopicName);
    setTutorOpen(true);
  };

  const handleToggleCompleted = async (concept: Concept) => {
    const isCurrentlyCompleted = completedConceptIds.has(concept.id);
    const nextState = !isCurrentlyCompleted;

    // Optimistic state update
    setCompletedConceptIds((prev) => {
      const next = new Set(prev);
      if (nextState) next.add(concept.id);
      else next.delete(concept.id);
      return next;
    });

    try {
      await setConceptProgress(concept.id, nextState);
      refreshProgress();
    } catch (err) {
      console.error('Failed to update concept completion:', err);
      refreshProgress();
    }
  };

  const handleTutorProgressChanged = (conceptId: number, completed: boolean) => {
    setCompletedConceptIds((prev) => {
      const next = new Set(prev);
      if (completed) next.add(conceptId);
      else next.delete(conceptId);
      return next;
    });
    refreshProgress();
  };

  const handlePreviousConcept = () => {
    if (currentIndex > 0) {
      const prev = flattenedConcepts[currentIndex - 1];
      setSelectedConcept(prev.concept);
      setActiveTopicName(prev.topicName);
    }
  };

  const handleNextConcept = () => {
    if (currentIndex < flattenedConcepts.length - 1 && currentIndex !== -1) {
      const next = flattenedConcepts[currentIndex + 1];
      setSelectedConcept(next.concept);
      setActiveTopicName(next.topicName);
    }
  };

  // Calculate match counts for search
  const matchingConceptsCount = useMemo(() => {
    if (!searchQuery.trim()) return data?.concept_count || 0;
    const q = searchQuery.toLowerCase();
    return flattenedConcepts.filter(
      (item) =>
        item.concept.name.toLowerCase().includes(q) ||
        item.concept.keywords?.some((k) => k.toLowerCase().includes(q)) ||
        item.concept.learning_objective?.toLowerCase().includes(q)
    ).length;
  }, [searchQuery, flattenedConcepts, data?.concept_count]);

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="knowledge-tree-layout">
        <div className="tree-left-panel">
          <div className="tree-overview-card">
            <Skeleton height={28} width="60%" />
            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              <Skeleton height={20} width={90} />
              <Skeleton height={20} width={90} />
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton height={48} borderRadius="8px" />
            <Skeleton height={48} borderRadius="8px" />
            <Skeleton height={48} borderRadius="8px" />
            <Skeleton height={48} borderRadius="8px" />
          </div>
        </div>
        <div className="tree-right-panel">
          <Card padding="lg">
            <Skeleton height={24} width="40%" />
            <Skeleton height={36} width="80%" style={{ marginTop: 14 }} />
            <Skeleton height={80} style={{ marginTop: 16 }} />
            <Skeleton height={120} style={{ marginTop: 16 }} />
          </Card>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !data) {
    return (
      <div className="tree-error-card">
        <div className="error-icon-box">
          <RotateCcw size={28} />
        </div>
        <h3 className="error-title">Unable to Load Knowledge Tree</h3>
        <p className="error-desc">
          {error || 'Could not fetch knowledge tree details from the server.'}
        </p>
        <Button variant="secondary" onClick={onRetry} leftIcon={<RotateCcw size={15} />}>
          Retry Request
        </Button>
      </div>
    );
  }

  // Empty State
  if (data.topics.length === 0) {
    return (
      <div className="tree-empty-state">
        <div className="empty-icon-box">
          <Inbox size={32} />
        </div>
        <h3>No Topics Extracted Yet</h3>
        <p>This subject does not currently contain any structured topics or concepts.</p>
      </div>
    );
  }

  const completedCount = completedConceptIds.size;
  const totalConcepts = data.concept_count;
  const overallPercentage =
    subjectProgress?.completion_percentage ??
    (totalConcepts > 0 ? Math.round((completedCount / totalConcepts) * 100) : 0);

  return (
    <div className="knowledge-tree-container">
      {/* Subject Overview Banner */}
      <div className="tree-overview-card">
        <div className="overview-meta">
          <div className="overview-title-row">
            <span className="overview-pill">
              <Sparkles size={12} /> Knowledge Tree
            </span>
          </div>
          <h1 className="overview-heading">
            {formatSubjectTitle(data.subject.name, data.subject.document_id)}
          </h1>
          <p className="overview-subtext">
            Structured hierarchical knowledge extracted and validated from source materials.
          </p>
        </div>

        <div className="overview-stats">
          <div className="stat-box">
            <div className="stat-label">
              <Layers size={13} /> Topics
            </div>
            <div className="stat-value">{data.topic_count}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">
              <BookMarked size={13} /> Concepts
            </div>
            <div className="stat-value">{data.concept_count}</div>
          </div>
          <div className="stat-box stat-box-progress" title={`${completedCount} of ${totalConcepts} concepts completed`}>
            <div className="stat-label">
              <CheckCircle2 size={13} className="text-emerald-500" /> Completed
            </div>
            <div className="stat-value">
              {completedCount} / {totalConcepts}
              <span className="stat-sub-percentage"> ({overallPercentage}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Panel Interactive Tree Layout */}
      <div className="knowledge-tree-layout">
        {/* Left Panel: Topics & Concepts Tree */}
        <div className="tree-left-panel">
          <TreeFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onExpandAll={() => setForceExpand(true)}
            onCollapseAll={() => setForceExpand(false)}
            totalConcepts={data.concept_count}
            matchingConcepts={matchingConceptsCount}
          />

          <div className="topics-tree-spine" role="tree" aria-label="Knowledge Tree Hierarchy">
            {data.topics.map((topic) => (
              <TopicNode
                key={topic.id}
                topic={topic}
                selectedConceptId={selectedConcept?.id || null}
                completedConceptIds={completedConceptIds}
                onSelectConcept={handleSelectConcept}
                onLearnWithAI={handleOpenTutor}
                searchQuery={searchQuery}
                forceExpand={forceExpand}
              />
            ))}
          </div>
        </div>

        {/* Right Panel: Selected Concept Details (Desktop Sticky) */}
        <div className="tree-right-panel desktop-only">
          <ConceptDetailsPanel
            concept={selectedConcept}
            topicName={activeTopicName}
            isCompleted={selectedConcept ? completedConceptIds.has(selectedConcept.id) : false}
            onPreviousConcept={handlePreviousConcept}
            onNextConcept={handleNextConcept}
            onLearnWithAI={handleOpenTutor}
            onToggleCompleted={handleToggleCompleted}
            hasPrevious={currentIndex > 0}
            hasNext={currentIndex < flattenedConcepts.length - 1 && currentIndex !== -1}
          />
        </div>
      </div>

      {/* Mobile Slide-Over Drawer for Concept Details */}
      {mobileDetailsOpen && (
        <div className="mobile-details-drawer-overlay">
          <div className="mobile-details-drawer">
            <ConceptDetailsPanel
              concept={selectedConcept}
              topicName={activeTopicName}
              isCompleted={selectedConcept ? completedConceptIds.has(selectedConcept.id) : false}
              onClose={() => setMobileDetailsOpen(false)}
              onPreviousConcept={handlePreviousConcept}
              onNextConcept={handleNextConcept}
              onLearnWithAI={handleOpenTutor}
              onToggleCompleted={handleToggleCompleted}
              hasPrevious={currentIndex > 0}
              hasNext={currentIndex < flattenedConcepts.length - 1 && currentIndex !== -1}
            />
          </div>
        </div>
      )}

      {/* Interactive AI Tutor Modal */}
      {tutorOpen && tutorConcept && (
        <InteractiveTutorModal
          isOpen={tutorOpen}
          conceptId={tutorConcept.id}
          subjectName={data.subject.name}
          topicName={tutorTopicName}
          onClose={() => setTutorOpen(false)}
          onProgressChanged={handleTutorProgressChanged}
        />
      )}
    </div>
  );
};
