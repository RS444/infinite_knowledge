import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getKnowledgeTree } from '../api/knowledge';
import type { KnowledgeTreeResponse, Subject } from '../types/api';
import { formatSubjectTitle } from '../utils/subjectFormat';
import { KnowledgeTree } from '../components/knowledge-tree/KnowledgeTree';
import { DeleteSubjectModal } from '../components/subjects/DeleteSubjectModal';
import { RenameSubjectModal } from '../components/subjects/RenameSubjectModal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import {
  BookOpen,
  Search,
  Upload,
  ArrowRight,
  Clock,
  RotateCcw,
  FileText,
  ArrowLeft,
  ChevronDown,
  Info,
  MoreVertical,
  Trash2,
  Edit3,
  Layers,
  GitBranch,
} from 'lucide-react';
import './MyLearningPage.css';

interface MyLearningPageProps {
  onSubjectContextUpdate?: (name: string) => void;
}

export const MyLearningPage: React.FC<MyLearningPageProps> = ({
  onSubjectContextUpdate,
}) => {
  const {
    subjects,
    isLoadingSubjects,
    subjectsError,
    refreshSubjects,
    recentUploads,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedConceptId,
    navigateTo,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [treeData, setTreeData] = useState<KnowledgeTreeResponse | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState<boolean>(false);
  const [activeMenuSubjectId, setActiveMenuSubjectId] = useState<number | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [subjectToRename, setSubjectToRename] = useState<Subject | null>(null);

  // Close actions menu when clicking anywhere outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuSubjectId(null);
    };
    if (activeMenuSubjectId !== null) {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenuSubjectId]);

  // Load tree data whenever selectedSubjectId changes
  const loadTree = useCallback(async () => {
    if (!selectedSubjectId) {
      setTreeData(null);
      setIsLoadingTree(false);
      return;
    }

    setIsLoadingTree(true);
    setTreeError(null);

    try {
      const response = await getKnowledgeTree(selectedSubjectId);
      setTreeData(response);
      if (onSubjectContextUpdate) {
        onSubjectContextUpdate(
          formatSubjectTitle(response.subject.name, response.subject.document_id)
        );
      }
    } catch (err: unknown) {
      setTreeError((err as Error)?.message || 'Failed to fetch knowledge tree from server.');
      setTreeData(null);
    } finally {
      setIsLoadingTree(false);
    }
  }, [selectedSubjectId, onSubjectContextUpdate]);

  useEffect(() => {
    if (selectedSubjectId) {
      loadTree();
    }
  }, [selectedSubjectId, loadTree]);

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Recently added';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Recently added';
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recently added';
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    const q = searchQuery.toLowerCase();
    const formatted = formatSubjectTitle(s.name, s.document_id).toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      formatted.includes(q) ||
      s.id.toString().includes(q) ||
      s.document_id.toString().includes(q)
    );
  });

  // =========================================================================
  // VIEW MODE: DETAILED KNOWLEDGE TREE & ROADMAP
  // =========================================================================
  if (selectedSubjectId !== null) {
    return (
      <div className="learning-page-container animate-fade-in">
        {/* Top Navigation & Context Bar */}
        <div className="tree-mode-nav-bar">
          <button
            className="tree-back-btn"
            onClick={() => setSelectedSubjectId(null)}
            title="Return to Subjects Catalog"
          >
            <ArrowLeft size={15} />
            <span>Back to All Subjects</span>
          </button>

          {/* Subject Switcher dropdown if multiple subjects exist */}
          {subjects.length > 1 && (
            <div className="selector-dropdown-wrap" style={{ position: 'relative' }}>
              <button
                className="selector-trigger-btn"
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
              >
                <BookOpen size={14} className="selector-icon" />
                <span className="selector-active-text">
                  {treeData
                    ? formatSubjectTitle(treeData.subject.name, treeData.subject.document_id)
                    : `Subject #${selectedSubjectId}`}
                </span>
                <ChevronDown size={14} />
              </button>

              {isSwitcherOpen && (
                <div className="selector-menu animate-fade-in">
                  {subjects.map((sub) => (
                    <button
                      key={sub.id}
                      className={`selector-menu-item ${
                        sub.id === selectedSubjectId ? 'is-active' : ''
                      }`}
                      onClick={() => {
                        setSelectedSubjectId(sub.id);
                        setIsSwitcherOpen(false);
                      }}
                    >
                      <span className="item-name">
                        {formatSubjectTitle(sub.name, sub.document_id)}
                      </span>
                      {sub.concept_count !== undefined && (
                        <span className="item-meta">
                          {sub.concept_count} {sub.concept_count === 1 ? 'concept' : 'concepts'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Knowledge Tree View */}
        <KnowledgeTree
          data={treeData}
          isLoading={isLoadingTree}
          error={treeError}
          onRetry={loadTree}
          initialConceptId={selectedConceptId}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: UNIFIED CATALOG OF SUBJECTS
  // =========================================================================
  return (
    <div className="learning-page-container animate-fade-in">
      {/* Page Header */}
      <div className="learning-catalog-header">
        <div className="learning-title-group">
          <h1 className="learning-page-title">My Learning</h1>
          <p className="learning-page-subtitle">
            Curated knowledge roadmaps generated from your study materials.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigateTo('upload')}
          leftIcon={<Upload size={15} />}
        >
          Upload Material
        </Button>
      </div>

      {/* Honest Ingestion Pipeline Notice (distinguishes uploaded vs ready states) */}
      {recentUploads.length > 0 && (
        <div className="session-pipeline-notice animate-fade-in">
          <div className="pipeline-notice-header">
            <Info size={16} className="pipeline-notice-icon" />
            <span>Recent Ingestion Pipeline Status</span>
          </div>
          <p className="pipeline-notice-desc">
            The following documents were uploaded in this session with text extracted. In this backend
            architecture, subjects and knowledge trees are generated via the offline extraction pipeline.
            Documents appear below once their knowledge trees are stored in the database.
          </p>
          <div className="pipeline-items-list">
            {recentUploads.map((item) => {
              const hasSubject = subjects.some((s) => s.document_id === item.document_id);
              return (
                <div key={item.document_id} className="pipeline-item-chip">
                  <span>{item.filename}</span>
                  <span>(Doc #{item.document_id})</span>
                  <span className="pipeline-stage-badge">
                    {hasSubject ? 'Subject Available' : 'Text Extracted • Pending Tree'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search and Counter Filter Bar */}
      <div className="learning-filter-bar">
        <div className="learning-search-box">
          <Search size={15} className="learning-search-icon" />
          <input
            type="text"
            className="learning-search-input"
            placeholder="Search subjects by title, filename, or document reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="learning-count-badge">
          <BookOpen size={13} />
          <span>
            {filteredSubjects.length} of {subjects.length} subjects available
          </span>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoadingSubjects && (
        <div className="learning-subjects-grid">
          <Skeleton height={170} borderRadius="12px" />
          <Skeleton height={170} borderRadius="12px" />
        </div>
      )}

      {/* Error State */}
      {!isLoadingSubjects && subjectsError && (
        <div className="learning-error-box">
          <h3>Failed to load subjects</h3>
          <p>{subjectsError}</p>
          <Button
            variant="secondary"
            onClick={refreshSubjects}
            leftIcon={<RotateCcw size={14} />}
          >
            Retry Request
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingSubjects && !subjectsError && subjects.length === 0 && (
        <div className="learning-empty-box">
          <FileText size={34} style={{ color: 'var(--text-tertiary)', marginBottom: 12 }} />
          <h3>No Learning Subjects Ready Yet</h3>
          <p>
            Upload study documents to ingest text and generate structured concept trees.
          </p>
          <Button
            variant="primary"
            onClick={() => navigateTo('upload')}
            leftIcon={<Upload size={15} />}
          >
            Upload Study Material
          </Button>
        </div>
      )}

      {/* Subjects Catalog Grid */}
      {!isLoadingSubjects && !subjectsError && subjects.length > 0 && (
        <div className="learning-subjects-grid">
          {filteredSubjects.map((sub) => {
            const displayTitle = formatSubjectTitle(sub.name, sub.document_id);

            return (
              <Card
                key={sub.id}
                variant="interactive"
                padding="lg"
                className="learning-subject-card"
                onClick={() => setSelectedSubjectId(sub.id)}
              >
                <div>
                  <div className="subject-card-meta-top">
                    <div className="subject-card-badges">
                      {sub.concept_count !== undefined && sub.concept_count > 0 ? (
                        <span className="subject-meta-pill" title={`${sub.concept_count} concepts extracted`}>
                          <Layers size={11} />
                          <span>{sub.concept_count} {sub.concept_count === 1 ? 'Concept' : 'Concepts'}</span>
                        </span>
                      ) : (
                        <span className="subject-meta-pill" title="Subject knowledge base">
                          <BookOpen size={11} />
                          <span>Knowledge Base</span>
                        </span>
                      )}
                      {sub.topic_count !== undefined && sub.topic_count > 0 && (
                        <span className="subject-meta-pill topic-pill" title={`${sub.topic_count} topics`}>
                          <GitBranch size={11} />
                          <span>{sub.topic_count} {sub.topic_count === 1 ? 'Topic' : 'Topics'}</span>
                        </span>
                      )}
                    </div>

                    {/* Three-dot Actions Menu */}
                    <div className="subject-actions-wrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`subject-actions-btn ${
                          activeMenuSubjectId === sub.id ? 'is-active' : ''
                        }`}
                        title="Subject actions"
                        aria-label={`Actions for subject ${sub.id}`}
                        aria-haspopup="true"
                        aria-expanded={activeMenuSubjectId === sub.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuSubjectId(
                            activeMenuSubjectId === sub.id ? null : sub.id
                          );
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeMenuSubjectId === sub.id && (
                        <div className="subject-actions-menu animate-fade-in" role="menu">
                          <button
                            type="button"
                            className="subject-menu-item"
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuSubjectId(null);
                              setSelectedSubjectId(sub.id);
                            }}
                          >
                            <BookOpen size={13} />
                            <span>Explore Knowledge Tree</span>
                          </button>

                          <button
                            type="button"
                            className="subject-menu-item"
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuSubjectId(null);
                              setSubjectToRename(sub);
                            }}
                          >
                            <Edit3 size={13} />
                            <span>Edit/Rename Subject...</span>
                          </button>

                          <div className="subject-menu-divider" />

                          <button
                            type="button"
                            className="subject-menu-item item-danger"
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuSubjectId(null);
                              setSubjectToDelete(sub);
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Delete Subject...</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="subject-heading-title">{displayTitle}</h3>
                </div>

                <div className="subject-card-bottom-row">
                  <div className="subject-timestamp">
                    <Clock size={12} />
                    <span>{formatDate(sub.created_at)}</span>
                  </div>

                  <div className="explore-tree-cta">
                    <span>Explore Knowledge Tree</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit/Rename Subject Modal */}
      <RenameSubjectModal
        isOpen={!!subjectToRename}
        subject={subjectToRename}
        onClose={() => setSubjectToRename(null)}
        onRenamed={refreshSubjects}
      />

      {/* Delete Subject Confirmation Modal */}
      <DeleteSubjectModal
        isOpen={!!subjectToDelete}
        subject={subjectToDelete}
        onClose={() => setSubjectToDelete(null)}
        onDeleted={refreshSubjects}
      />
    </div>
  );
};
