import React, { useState, useEffect, useCallback } from 'react';
import { getKnowledgeTree } from '../api/knowledge';
import { listSubjects } from '../api/subjects';
import type { KnowledgeTreeResponse, Subject, SubjectsResponse } from '../types/api';
import { useApp } from '../context/AppContext';
import { KnowledgeTree } from '../components/knowledge-tree/KnowledgeTree';
import { Button } from '../components/ui/Button';
import {
  BookOpen,
  ChevronDown,
  Layers,
  Upload,
} from 'lucide-react';
import { formatSubjectTitle } from '../utils/subjectFormat';
import './KnowledgeTreePage.css';

interface KnowledgeTreePageProps {
  onSubjectContextUpdate?: (name: string) => void;
}

export const KnowledgeTreePage: React.FC<KnowledgeTreePageProps> = ({
  onSubjectContextUpdate,
}) => {
  const { selectedSubjectId, setSelectedSubjectId, selectedConceptId, navigateTo } = useApp();

  const [treeData, setTreeData] = useState<KnowledgeTreeResponse | null>(null);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState<boolean>(false);

  // Fetch subjects list for the switcher dropdown and initial fallback
  useEffect(() => {
    let isMounted = true;
    listSubjects()
      .then((res: SubjectsResponse) => {
        if (!isMounted) return;
        const subjects = res.subjects || [];
        setSubjectsList(subjects);
        // If no subject is currently selected in context, select the first one
        if (!selectedSubjectId && subjects.length > 0) {
          setSelectedSubjectId(subjects[0].id);
        }
      })
      .catch(() => {
        // Handled silently; knowledge tree fetch will reflect status
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSubjectId, setSelectedSubjectId]);

  // Fetch knowledge tree data whenever selectedSubjectId changes
  const loadKnowledgeTree = useCallback(async () => {
    if (!selectedSubjectId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getKnowledgeTree(selectedSubjectId);
      setTreeData(response);
      if (onSubjectContextUpdate) {
        onSubjectContextUpdate(
          formatSubjectTitle(response.subject.name, response.subject.document_id)
        );
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to fetch knowledge tree from server.');
      setTreeData(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubjectId, onSubjectContextUpdate]);

  useEffect(() => {
    loadKnowledgeTree();
  }, [loadKnowledgeTree]);

  // If no subjects exist at all in database
  if (!isLoading && subjectsList.length === 0 && !treeData) {
    return (
      <div className="no-subjects-view animate-fade-in">
        <div className="no-subjects-icon">
          <Layers size={36} />
        </div>
        <h2>No Knowledge Trees Available</h2>
        <p>
          There are currently no subjects or knowledge trees generated in the system. Upload a
          document to begin.
        </p>
        <Button
          variant="primary"
          onClick={() => navigateTo('upload')}
          leftIcon={<Upload size={16} />}
          style={{ marginTop: 14 }}
        >
          Upload Study Material
        </Button>
      </div>
    );
  }

  return (
    <div className="knowledge-tree-page animate-fade-in">
      {/* Subject Selector Bar */}
      {subjectsList.length > 1 && (
        <div className="subject-selector-bar">
          <span className="selector-label">Switch Subject:</span>
          <div className="selector-dropdown-wrap">
            <button
              className="selector-trigger-btn"
              onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
            >
              <BookOpen size={14} className="selector-icon" />
              <span className="selector-active-text">
                {treeData
                  ? formatSubjectTitle(treeData.subject.name, treeData.subject.document_id)
                  : 'Select Subject'}
              </span>
              <ChevronDown size={14} />
            </button>

            {isSwitcherOpen && (
              <div className="selector-menu animate-fade-in">
                {subjectsList.map((sub) => (
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
        </div>
      )}

      {/* Main Knowledge Tree View */}
      <KnowledgeTree
        data={treeData}
        isLoading={isLoading}
        error={error}
        onRetry={loadKnowledgeTree}
        initialConceptId={selectedConceptId}
      />
    </div>
  );
};
