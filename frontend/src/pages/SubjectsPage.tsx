import React, { useState, useEffect } from 'react';
import { listSubjects } from '../api/subjects';
import type { Subject } from '../types/api';
import { useApp } from '../context/AppContext';
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
  Layers,
  GitBranch,
} from 'lucide-react';
import { formatSubjectTitle } from '../utils/subjectFormat';
import './SubjectsPage.css';

export const SubjectsPage: React.FC = () => {
  const { navigateTo } = useApp();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadSubjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listSubjects();
      setSubjects(response.subjects || []);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to fetch subjects from the backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toString().includes(searchQuery) ||
      s.document_id.toString().includes(searchQuery)
  );

  return (
    <div className="subjects-page-container animate-fade-in">
      {/* Page Header */}
      <div className="subjects-page-header">
        <div>
          <h1 className="page-title">My Subjects</h1>
          <p className="page-subtitle">
            Study materials ingested and converted into hierarchical knowledge structures.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigateTo('upload')}
          leftIcon={<Upload size={15} />}
        >
          Upload New Material
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="subjects-filter-bar">
        <div className="subjects-search-wrapper">
          <Search size={15} className="subjects-search-icon" />
          <input
            type="text"
            className="subjects-search-input"
            placeholder="Search subjects by name, ID, or document reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="subjects-count-badge">
          <BookOpen size={13} />
          <span>
            {filteredSubjects.length} of {subjects.length} subjects
          </span>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="subjects-list-grid">
          <Skeleton height={160} borderRadius="12px" />
          <Skeleton height={160} borderRadius="12px" />
          <Skeleton height={160} borderRadius="12px" />
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="subjects-error-box">
          <div className="error-icon-circle">
            <RotateCcw size={24} />
          </div>
          <h3>Failed to load subjects</h3>
          <p>{error}</p>
          <Button variant="secondary" onClick={loadSubjects} leftIcon={<RotateCcw size={14} />}>
            Retry Request
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && subjects.length === 0 && (
        <div className="subjects-empty-box">
          <div className="empty-icon-circle">
            <FileText size={32} />
          </div>
          <h3>No Registered Subjects</h3>
          <p>
            No subjects currently exist in the database. Upload a study document to extract a
            knowledge tree.
          </p>
          <Button
            variant="primary"
            onClick={() => navigateTo('upload')}
            leftIcon={<Upload size={15} />}
            style={{ marginTop: 14 }}
          >
            Upload Study Material
          </Button>
        </div>
      )}

      {/* Subject Cards Grid */}
      {!isLoading && !error && subjects.length > 0 && (
        <div className="subjects-list-grid">
          {filteredSubjects.map((sub) => (
            <Card
              key={sub.id}
              variant="interactive"
              padding="lg"
              className="subject-card"
              onClick={() => navigateTo('tree', sub.id)}
            >
              <div className="card-top-row">
                {sub.concept_count !== undefined && sub.concept_count > 0 ? (
                  <span className="card-meta-pill" title={`${sub.concept_count} concepts extracted`}>
                    <Layers size={11} style={{ marginRight: 4 }} />
                    {sub.concept_count} {sub.concept_count === 1 ? 'Concept' : 'Concepts'}
                  </span>
                ) : (
                  <span className="card-meta-pill">
                    <BookOpen size={11} style={{ marginRight: 4 }} />
                    Knowledge Base
                  </span>
                )}
                {sub.topic_count !== undefined && sub.topic_count > 0 && (
                  <span className="card-meta-pill topic-pill" title={`${sub.topic_count} topics`}>
                    <GitBranch size={11} style={{ marginRight: 3 }} />
                    {sub.topic_count} {sub.topic_count === 1 ? 'Topic' : 'Topics'}
                  </span>
                )}
              </div>

              <div className="card-title-group">
                <h3 className="subject-heading">{formatSubjectTitle(sub.name, sub.document_id)}</h3>
              </div>

              <div className="card-bottom-row">
                <div className="created-timestamp">
                  <Clock size={12} />
                  <span>{formatDate(sub.created_at)}</span>
                </div>

                <div className="open-tree-action">
                  <span>Explore Knowledge Tree</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
