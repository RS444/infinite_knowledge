import React from 'react';
import { useApp } from '../context/AppContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CheckCircle2, TrendingUp, Sparkles, BookOpen, Clock } from 'lucide-react';

interface PlaceholderPageProps {
  type: 'assessments' | 'progress';
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ type }) => {
  const { navigateTo } = useApp();

  const isAssessment = type === 'assessments';

  return (
    <div className="placeholder-page animate-fade-in" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ marginBottom: 14 }}>
        <Badge variant="outline" size="md">
          <Clock size={12} /> Phase 2 Product Roadmap
        </Badge>
      </div>

      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: '50%',
          backgroundColor: 'var(--accent-50)',
          color: 'var(--accent-600)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
        }}
      >
        {isAssessment ? <CheckCircle2 size={30} /> : <TrendingUp size={30} />}
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        {isAssessment ? 'Interactive Assessments & Quizzes' : 'Learner Progress & Mastery'}
      </h1>

      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 28px' }}>
        {isAssessment
          ? 'Automated quiz generation, free-form answer evaluation, and concept validation endpoints are scheduled for subsequent engineering phases. The current phase establishes the core knowledge-tree extraction and grounding architecture.'
          : 'Personalized mastery tracking, spaced repetition schedules, and learning analytics will be connected once assessment and evaluation models are deployed.'}
      </p>

      {/* Feature Preview Card */}
      <Card padding="lg" style={{ textAlign: 'left', marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
          {isAssessment ? 'Planned Assessment Capabilities' : 'Planned Mastery Metrics'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isAssessment ? (
            <>
              <div style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                <Sparkles size={16} style={{ color: 'var(--accent-600)', flexShrink: 0, marginTop: 2 }} />
                <span>Concept-grounded multiple choice and short answer evaluation based on verified chunks.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                <Sparkles size={16} style={{ color: 'var(--accent-600)', flexShrink: 0, marginTop: 2 }} />
                <span>Instant diagnostic feedback with direct jump-to-reference in the knowledge tree.</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                <Sparkles size={16} style={{ color: 'var(--accent-600)', flexShrink: 0, marginTop: 2 }} />
                <span>Topic completion curves and retention memory decay modeling.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                <Sparkles size={16} style={{ color: 'var(--accent-600)', flexShrink: 0, marginTop: 2 }} />
                <span>Active concept review queue driven by spaced repetition intervals.</span>
              </div>
            </>
          )}
        </div>
      </Card>

      <Button variant="primary" onClick={() => navigateTo('subjects')} leftIcon={<BookOpen size={15} />}>
        Explore Current Knowledge Trees
      </Button>
    </div>
  );
};
