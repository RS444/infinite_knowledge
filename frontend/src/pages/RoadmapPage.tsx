import React, { useEffect, useState } from 'react';
import { listSubjects } from '../api/subjects';
import type { Subject, SubjectsResponse } from '../types/api';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { GitBranch, ArrowRight, Upload, Sparkles, Layers, BookOpen } from 'lucide-react';
import { formatSubjectTitle } from '../utils/subjectFormat';

export const RoadmapPage: React.FC = () => {
  const { navigateTo } = useApp();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    listSubjects()
      .then((res: SubjectsResponse) => {
        setSubjects(res.subjects || []);
      })
      .catch(() => {
        setSubjects([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="roadmap-page animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <Badge variant="accent" size="sm" style={{ marginBottom: 8 }}>
            <Sparkles size={11} /> Learning Path
          </Badge>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
            Study Roadmap
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Explore structured learning trajectories generated from your uploaded materials.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigateTo('upload')}
          leftIcon={<Upload size={15} />}
        >
          Add Material
        </Button>
      </div>

      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
          <Skeleton height={140} borderRadius="12px" />
          <Skeleton height={140} borderRadius="12px" />
        </div>
      )}

      {!isLoading && subjects.length === 0 && (
        <Card padding="lg" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <GitBranch size={36} style={{ color: 'var(--text-tertiary)', margin: '0 auto 14px' }} />
          <h3>No Roadmap Available</h3>
          <p style={{ maxWidth: 400, margin: '8px auto 16px', fontSize: 13.5, color: 'var(--text-secondary)' }}>
            Upload study documents to generate your personalized knowledge roadmap.
          </p>
          <Button variant="primary" onClick={() => navigateTo('upload')} leftIcon={<Upload size={15} />}>
            Upload Document
          </Button>
        </Card>
      )}

      {!isLoading && subjects.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
            Select a Subject Roadmap
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
            {subjects.map((sub) => (
              <Card
                key={sub.id}
                variant="interactive"
                padding="lg"
                onClick={() => navigateTo('tree', sub.id)}
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    {sub.concept_count !== undefined && sub.concept_count > 0 ? (
                      <Badge variant="accent" size="sm">
                        <Layers size={11} style={{ marginRight: 4 }} />
                        {sub.concept_count} {sub.concept_count === 1 ? 'Concept' : 'Concepts'}
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        <BookOpen size={11} style={{ marginRight: 4 }} />
                        Knowledge Base
                      </Badge>
                    )}
                    {sub.topic_count !== undefined && sub.topic_count > 0 && (
                      <Badge variant="neutral" size="sm">
                        <GitBranch size={11} style={{ marginRight: 3 }} />
                        {sub.topic_count} {sub.topic_count === 1 ? 'Topic' : 'Topics'}
                      </Badge>
                    )}
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, wordBreak: 'break-word' }}>
                    {formatSubjectTitle(sub.name, sub.document_id)}
                  </h3>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 14,
                    marginTop: 18,
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: 12.5,
                    color: 'var(--accent-600)',
                    fontWeight: 600,
                  }}
                >
                  <span>Open Knowledge Tree Roadmap</span>
                  <ArrowRight size={14} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
