import React from 'react';
import { useApp } from '../context/AppContext';
import { formatSubjectTitle } from '../utils/subjectFormat';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import {
  Sparkles,
  Upload,
  BookOpen,
  ArrowRight,
  GitBranch,
  Layers,
  Database,
  Clock,
  RotateCcw,
  FileText,
  Info,
} from 'lucide-react';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
  const {
    navigateTo,
    backendStatus,
    subjects,
    isLoadingSubjects,
    subjectsError,
    refreshSubjects,
    recentUploads,
  } = useApp();

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Recently added';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Recently added';
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently added';
    }
  };

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Welcome Banner */}
      <div className="dashboard-welcome-banner">
        <div className="banner-content">
          <Badge variant="accent" size="sm" className="banner-badge">
            <Sparkles size={11} /> AI Knowledge Platform
          </Badge>
          <h1 className="banner-title">Welcome to Infinite Knowledge</h1>
          <p className="banner-description">
            Transform study materials into hierarchical knowledge roadmaps with concept-level
            granularity and verifiable chunk citations.
          </p>

          <div className="banner-actions">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigateTo('upload')}
              leftIcon={<Upload size={16} />}
            >
              Upload Study Material
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => navigateTo('learning')}
              leftIcon={<BookOpen size={16} />}
            >
              My Learning ({subjects.length})
            </Button>
          </div>
        </div>

        {/* Real Metrics (Strictly derived from API data) */}
        <div className="banner-metrics">
          <div className="metric-tile">
            <div className="metric-header">
              <BookOpen size={14} className="metric-icon" />
              <span>Available Subjects</span>
            </div>
            <div className="metric-num">
              {isLoadingSubjects ? <Skeleton width={40} height={24} /> : subjects.length}
            </div>
            <div className="metric-sub">Structured learning roadmaps</div>
          </div>

          <div className="metric-tile">
            <div className="metric-header">
              <Database size={14} className="metric-icon" />
              <span>Backend API</span>
            </div>
            <div className="metric-num text-sm">
              <Badge
                variant={backendStatus === 'online' ? 'success' : 'warning'}
                size="sm"
                dot
              >
                {backendStatus === 'online' ? 'Operational' : 'Connecting'}
              </Badge>
            </div>
            <div className="metric-sub">FastAPI / PostgreSQL</div>
          </div>
        </div>
      </div>

      {/* Primary 3-Step Educational Workflow */}
      <div className="workflow-section">
        <h2 className="section-title">The Learning Architecture</h2>
        <div className="workflow-grid">
          <div className="workflow-step">
            <div className="step-num">01</div>
            <div className="step-icon-box">
              <Upload size={18} />
            </div>
            <h3 className="step-title">Ingest Document</h3>
            <p className="step-desc">
              Upload PDF or DOCX textbooks and notes. Text chunks are preserved with character offsets.
            </p>
          </div>

          <div className="workflow-step">
            <div className="step-num">02</div>
            <div className="step-icon-box">
              <Layers size={18} />
            </div>
            <h3 className="step-title">Extract Knowledge</h3>
            <p className="step-desc">
              AI maps content into a multi-tier hierarchy: Subject &rarr; Topics &rarr; Concepts.
            </p>
          </div>

          <div className="workflow-step">
            <div className="step-num">03</div>
            <div className="step-icon-box">
              <GitBranch size={18} />
            </div>
            <h3 className="step-title">Interactive Roadmap</h3>
            <p className="step-desc">
              Master concepts with concise summaries, learning objectives, and verified citations.
            </p>
          </div>
        </div>
      </div>

      {/* Ingestion Pipeline Notice if documents were uploaded during session */}
      {recentUploads.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderLeft: '4px solid var(--accent-500)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Info size={16} style={{ color: 'var(--accent-600)', flexShrink: 0 }} />
            <span>
              <strong>{recentUploads.length} document(s) recently uploaded.</strong> Raw text is extracted in the database. Active subjects are generated once the backend extraction pipeline stores the knowledge tree.
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigateTo('learning')}>
            View Status in My Learning
          </Button>
        </div>
      )}

      {/* My Learning Section */}
      <div className="dashboard-subjects-section">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">My Learning</h2>
            <p className="section-sub">Active learning units with generated knowledge trees.</p>
          </div>

          {subjects.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateTo('learning')}
              rightIcon={<ArrowRight size={14} />}
            >
              Open My Learning
            </Button>
          )}
        </div>

        {/* Subjects Loading State */}
        {isLoadingSubjects && (
          <div className="subjects-grid">
            <Skeleton height={140} borderRadius="12px" />
            <Skeleton height={140} borderRadius="12px" />
          </div>
        )}

        {/* Subjects Error State */}
        {!isLoadingSubjects && subjectsError && (
          <Card padding="md" className="error-notice-card">
            <div className="notice-inner">
              <div className="notice-meta">
                <h4>Unable to connect to Subjects API</h4>
                <p>{subjectsError}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={refreshSubjects} leftIcon={<RotateCcw size={14} />}>
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Subjects Empty State */}
        {!isLoadingSubjects && !subjectsError && subjects.length === 0 && (
          <Card padding="lg" className="empty-subjects-card">
            <div className="empty-icon-wrap">
              <FileText size={32} />
            </div>
            <h3>No Study Materials Ready Yet</h3>
            <p>
              Upload your first PDF or Word document to generate an AI knowledge tree and structured study roadmap.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigateTo('upload')}
              leftIcon={<Upload size={16} />}
              style={{ marginTop: 14 }}
            >
              Upload Study Material
            </Button>
          </Card>
        )}

        {/* Subjects Cards List */}
        {!isLoadingSubjects && !subjectsError && subjects.length > 0 && (
          <div className="subjects-grid">
            {subjects.map((sub) => {
              const displayTitle = formatSubjectTitle(sub.name, sub.document_id);

              return (
                <Card
                  key={sub.id}
                  variant="interactive"
                  padding="md"
                  className="subject-card-item"
                  onClick={() => navigateTo('learning', sub.id)}
                >
                  <div className="subject-card-top">
                    {sub.concept_count !== undefined && sub.concept_count > 0 ? (
                      <div className="subject-badge-pill" title={`${sub.concept_count} concepts extracted`}>
                        <Layers size={11} style={{ marginRight: 4 }} />
                        {sub.concept_count} {sub.concept_count === 1 ? 'Concept' : 'Concepts'}
                      </div>
                    ) : (
                      <div className="subject-badge-pill">
                        <BookOpen size={11} style={{ marginRight: 4 }} />
                        Knowledge Base
                      </div>
                    )}
                    {sub.topic_count !== undefined && sub.topic_count > 0 && (
                      <span className="subject-doc-ref" title={`${sub.topic_count} topics`}>
                        <GitBranch size={11} style={{ marginRight: 3 }} />
                        {sub.topic_count} {sub.topic_count === 1 ? 'Topic' : 'Topics'}
                      </span>
                    )}
                  </div>

                  <h3 className="subject-item-name">{displayTitle}</h3>

                  <div className="subject-card-footer">
                    <span className="subject-date">
                      <Clock size={12} /> {formatDate(sub.created_at)}
                    </span>
                    <span className="open-tree-cta">
                      Study Roadmap <ArrowRight size={13} />
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

