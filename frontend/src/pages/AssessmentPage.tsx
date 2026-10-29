import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getKnowledgeTree } from '../api/knowledge';
import { getSubjectProgress, setConceptProgress } from '../api/tutor';
import { formatSubjectTitle } from '../utils/subjectFormat';
import { generateAssessmentQuestions, generateFlashcards } from '../utils/assessmentGenerator';
import type { KnowledgeTreeResponse } from '../types/api';
import type {
  AssessmentMode,
  AssessmentQuestion,
  AssessmentAttempt,
  QuestionAnswer,
  ConceptFlashcard,
} from '../types/assessment';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { InteractiveTutorModal } from '../components/tutor/InteractiveTutorModal';
import {
  CheckCircle2,
  Award,
  Clock,
  Sparkles,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Layers,
  Bot,
  Check,
  X,
  Target,
  Zap,
  TrendingUp,
} from 'lucide-react';
import './AssessmentPage.css';

const LOCAL_STORAGE_KEY = 'infinite_knowledge_assessments_history';

export const AssessmentPage: React.FC = () => {
  const { subjects, isLoadingSubjects, selectedSubjectId, setSelectedSubjectId, navigateTo, showToast } =
    useApp();

  // Active Subject & Knowledge Tree
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(
    selectedSubjectId || (subjects.length > 0 ? subjects[0].id : null)
  );
  const [treeData, setTreeData] = useState<KnowledgeTreeResponse | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);
  const [completedConceptIds, setCompletedConceptIds] = useState<Set<number>>(new Set());

  // Assessment Config & Mode
  const [viewState, setViewState] = useState<'overview' | 'quiz' | 'flashcards' | 'results'>('overview');
  const [selectedMode, setSelectedMode] = useState<AssessmentMode>('quiz');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [instantFeedback, setInstantFeedback] = useState<boolean>(true);

  // Active Quiz State
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [quizTimerSeconds, setQuizTimerSeconds] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);

  // Active Flashcards State
  const [flashcards, setFlashcards] = useState<ConceptFlashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);

  // Past Attempts History
  const [history, setHistory] = useState<AssessmentAttempt[]>([]);

  // Interactive AI Tutor Modal Bridge
  const [tutorModalOpen, setTutorModalOpen] = useState<boolean>(false);
  const [tutorConcept, setTutorConcept] = useState<{
    id: number;
    name: string;
    topicName: string;
  } | null>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to parse assessment history from localStorage:', e);
    }
  }, []);

  // Sync default active subject
  useEffect(() => {
    if (!activeSubjectId && subjects.length > 0) {
      setActiveSubjectId(subjects[0].id);
    }
  }, [subjects, activeSubjectId]);

  // Load Tree and Progress when activeSubjectId changes
  useEffect(() => {
    if (!activeSubjectId) return;

    let isMounted = true;
    setIsLoadingTree(true);

    Promise.all([
      getKnowledgeTree(activeSubjectId),
      getSubjectProgress(activeSubjectId).catch(() => null),
    ])
      .then(([tree, progress]) => {
        if (!isMounted) return;
        setTreeData(tree);
        if (progress?.completed_concept_ids) {
          setCompletedConceptIds(new Set(progress.completed_concept_ids));
        } else {
          setCompletedConceptIds(new Set());
        }
      })
      .catch((err) => {
        console.error('Failed to load subject tree for assessment:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingTree(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeSubjectId]);

  // Quiz Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isTimerActive && viewState === 'quiz') {
      timer = setInterval(() => {
        setQuizTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerActive, viewState]);

  // Current Question Object
  const currentQuestion = useMemo(() => {
    return questions[currentQuestionIndex] || null;
  }, [questions, currentQuestionIndex]);

  // Current Card Object
  const currentCard = useMemo(() => {
    return flashcards[currentCardIndex] || null;
  }, [flashcards, currentCardIndex]);

  // Format Timer mm:ss
  const formattedTime = useMemo(() => {
    const mins = Math.floor(quizTimerSeconds / 60);
    const secs = quizTimerSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [quizTimerSeconds]);

  // Total Completed Concepts across subject
  const currentSubject = useMemo(() => {
    return subjects.find((s) => s.id === activeSubjectId);
  }, [subjects, activeSubjectId]);

  // Calculate Overall History Metrics
  const historyStats = useMemo(() => {
    if (history.length === 0) {
      return { totalQuizzes: 0, avgScore: 0, totalQuestionsEvaluated: 0 };
    }
    const totalScore = history.reduce((acc, h) => acc + h.scorePercentage, 0);
    const totalQ = history.reduce((acc, h) => acc + h.totalQuestions, 0);
    return {
      totalQuizzes: history.length,
      avgScore: Math.round(totalScore / history.length),
      totalQuestionsEvaluated: totalQ,
    };
  }, [history]);

  // Start Assessment Handler
  const handleStartAssessment = () => {
    if (!treeData) return;

    if (selectedMode === 'flashcards') {
      const cards = generateFlashcards(treeData, completedConceptIds);
      if (cards.length === 0) {
        showToast({ type: 'error', title: 'No Concepts Found', message: 'Subject tree has no concepts to review.' });
        return;
      }
      setFlashcards(cards);
      setCurrentCardIndex(0);
      setIsCardFlipped(false);
      setViewState('flashcards');
      return;
    }

    const generated = generateAssessmentQuestions(treeData, {
      count: questionCount,
      targetUncompletedOnly: selectedMode === 'weak-areas',
      completedConceptIds,
    });

    if (generated.length === 0) {
      showToast({ type: 'error', title: 'Generation Failed', message: 'Not enough concepts to create a quiz.' });
      return;
    }

    setQuestions(generated);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setAnswers({});
    setQuizTimerSeconds(0);
    setIsTimerActive(true);
    setViewState('quiz');
  };

  // Option Click Handler
  const handleSelectOption = (index: number) => {
    if (!currentQuestion) return;
    if (answers[currentQuestion.id] && instantFeedback) return;

    setSelectedOption(index);

    const isCorrect = index === currentQuestion.correctIndex;
    const answerData: QuestionAnswer = {
      questionId: currentQuestion.id,
      conceptId: currentQuestion.conceptId,
      selectedOption: index,
      isCorrect,
    };

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answerData,
    }));
  };

  // Move to Next Question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      const nextQ = questions[nextIdx];
      setSelectedOption(answers[nextQ?.id]?.selectedOption ?? null);
    } else {
      handleFinishQuiz();
    }
  };

  // Move to Previous Question
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIdx = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIdx);
      const prevQ = questions[prevIdx];
      setSelectedOption(answers[prevQ?.id]?.selectedOption ?? null);
    }
  };

  // Finish Quiz and Compute Results
  const handleFinishQuiz = () => {
    setIsTimerActive(false);

    let correctCount = 0;
    const answerList: QuestionAnswer[] = [];

    questions.forEach((q) => {
      const ans = answers[q.id];
      if (ans && ans.isCorrect) {
        correctCount++;
      }
      if (ans) {
        answerList.push(ans);
      } else {
        answerList.push({
          questionId: q.id,
          conceptId: q.conceptId,
          selectedOption: -1,
          isCorrect: false,
        });
      }
    });

    const scorePercentage = Math.round((correctCount / questions.length) * 100);

    const attempt: AssessmentAttempt = {
      id: `att-${Date.now()}`,
      subjectId: activeSubjectId || 0,
      subjectName: currentSubject ? formatSubjectTitle(currentSubject.name) : 'Subject',
      timestamp: new Date().toISOString(),
      mode: selectedMode,
      totalQuestions: questions.length,
      correctCount,
      scorePercentage,
      timeSpentSeconds: quizTimerSeconds,
      answers: answerList,
    };

    const updatedHistory = [attempt, ...history.slice(0, 19)];
    setHistory(updatedHistory);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
      console.warn('Could not save attempt history:', e);
    }

    setViewState('results');
  };

  // Toggle Concept Mastery Directly from Assessment / Flashcard
  const handleToggleConceptMastery = async (conceptId: number) => {
    const isCurrentlyCompleted = completedConceptIds.has(conceptId);
    const newStatus = !isCurrentlyCompleted;

    try {
      await setConceptProgress(conceptId, newStatus);
      setCompletedConceptIds((prev) => {
        const next = new Set(prev);
        if (newStatus) next.add(conceptId);
        else next.delete(conceptId);
        return next;
      });

      showToast({
        type: 'success',
        title: newStatus ? 'Concept Mastered!' : 'Mastery Cleared',
        message: newStatus ? 'Recorded to your persistent learning progress.' : 'Concept marked for review.',
      });
    } catch (err) {
      console.error('Failed to toggle concept mastery:', err);
      showToast({ type: 'error', title: 'Error', message: 'Failed to update progress in backend.' });
    }
  };

  // Open AI Tutor for a Concept
  const handleOpenTutor = (conceptId: number, conceptName: string, topicName: string) => {
    setTutorConcept({ id: conceptId, name: conceptName, topicName });
    setTutorModalOpen(true);
  };

  // Keyboard navigation for Quiz & Flashcards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewState === 'quiz' && currentQuestion) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const optIdx = parseInt(e.key, 10) - 1;
          if (optIdx < currentQuestion.options.length) {
            handleSelectOption(optIdx);
          }
        } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
          if (selectedOption !== null || answers[currentQuestion.id]) {
            handleNextQuestion();
          }
        } else if (e.key === 'ArrowLeft') {
          handlePrevQuestion();
        }
      } else if (viewState === 'flashcards' && currentCard) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setIsCardFlipped((prev) => !prev);
        } else if (e.key === 'ArrowRight') {
          if (currentCardIndex < flashcards.length - 1) {
            setCurrentCardIndex((prev) => prev + 1);
            setIsCardFlipped(false);
          }
        } else if (e.key === 'ArrowLeft') {
          if (currentCardIndex > 0) {
            setCurrentCardIndex((prev) => prev - 1);
            setIsCardFlipped(false);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewState, currentQuestion, selectedOption, answers, currentCard, currentCardIndex, flashcards.length]);

  return (
    <div className="assessment-page">
      {/* View State: OVERVIEW */}
      {viewState === 'overview' && (
        <>
          <div className="assessment-header">
            <h1 className="assessment-title">
              <CheckCircle2 size={26} style={{ color: 'var(--accent-600)' }} />
              Interactive Assessments & Quizzes
            </h1>
            <p className="assessment-subtitle">
              Validate your knowledge, diagnose weak concepts, and test active recall with verified curriculum
              grounding.
            </p>
          </div>

          {/* Metrics Row */}
          <div className="assessment-stats-grid">
            <div className="assessment-stat-card">
              <div className="stat-icon-wrapper purple">
                <Award size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Assessments Taken</span>
                <span className="stat-value">{historyStats.totalQuizzes}</span>
              </div>
            </div>

            <div className="assessment-stat-card">
              <div className="stat-icon-wrapper emerald">
                <TrendingUp size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Average Accuracy</span>
                <span className="stat-value">{historyStats.avgScore}%</span>
              </div>
            </div>

            <div className="assessment-stat-card">
              <div className="stat-icon-wrapper blue">
                <CheckCircle2 size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Mastered Concepts</span>
                <span className="stat-value">{completedConceptIds.size}</span>
              </div>
            </div>

            <div className="assessment-stat-card">
              <div className="stat-icon-wrapper amber">
                <Target size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Subject Total Concepts</span>
                <span className="stat-value">{treeData?.concept_count ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Setup Card */}
          <div className="assessment-setup-card">
            <h2 className="setup-section-title">
              <Sparkles size={17} style={{ color: 'var(--accent-600)' }} />
              Configure Assessment
            </h2>

            {/* Subject Selector */}
            <div className="form-group">
              <label htmlFor="subject-select" className="form-label">
                Select Subject for Evaluation
              </label>
              {isLoadingSubjects ? (
                <Skeleton height={42} />
              ) : (
                <select
                  id="subject-select"
                  className="subject-select-input"
                  value={activeSubjectId || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setActiveSubjectId(id);
                    setSelectedSubjectId(id);
                  }}
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {formatSubjectTitle(sub.name)} ({sub.topic_count || 0} topics, {sub.concept_count || 0} concepts)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Mode Selection */}
            <div className="form-group">
              <label className="form-label">Evaluation Mode</label>
              <div className="mode-selection-grid">
                <div
                  className={`mode-card ${selectedMode === 'quiz' ? 'is-selected' : ''}`}
                  onClick={() => setSelectedMode('quiz')}
                >
                  <div className="mode-card-header">
                    <Target size={18} style={{ color: 'var(--accent-600)' }} />
                    <span className="mode-card-title">Comprehensive Quiz</span>
                  </div>
                  <p className="mode-card-desc">
                    Balanced multiple-choice test evaluating concept definitions, learning objectives, and core key
                    terms.
                  </p>
                </div>

                <div
                  className={`mode-card ${selectedMode === 'weak-areas' ? 'is-selected' : ''}`}
                  onClick={() => setSelectedMode('weak-areas')}
                >
                  <div className="mode-card-header">
                    <Zap size={18} style={{ color: '#d97706' }} />
                    <span className="mode-card-title">Targeted Weak Areas</span>
                  </div>
                  <p className="mode-card-desc">
                    Prioritizes uncompleted concepts or topics that require reinforcement for efficient revision.
                  </p>
                </div>

                <div
                  className={`mode-card ${selectedMode === 'flashcards' ? 'is-selected' : ''}`}
                  onClick={() => setSelectedMode('flashcards')}
                >
                  <div className="mode-card-header">
                    <Layers size={18} style={{ color: '#059669' }} />
                    <span className="mode-card-title">Flashcard Drill</span>
                  </div>
                  <p className="mode-card-desc">
                    Rapid active recall testing with interactive card flips, summary prompts, and instant mastery marking.
                  </p>
                </div>
              </div>
            </div>

            {/* Quiz Controls (if quiz mode) */}
            {selectedMode !== 'flashcards' && (
              <div className="quiz-controls-row">
                <div className="count-selector-group">
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Question Count:
                  </span>
                  {[5, 10, 15].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      className={`count-btn ${questionCount === cnt ? 'is-active' : ''}`}
                      onClick={() => setQuestionCount(cnt)}
                    >
                      {cnt} Qs
                    </button>
                  ))}
                </div>

                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-checkbox"
                    checked={instantFeedback}
                    onChange={(e) => setInstantFeedback(e.target.checked)}
                  />
                  <span>Instant Diagnostic Feedback (Show explanation immediately)</span>
                </label>
              </div>
            )}

            {/* Launch Button */}
            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <Button
                variant="primary"
                size="lg"
                onClick={handleStartAssessment}
                disabled={isLoadingTree || !treeData}
                leftIcon={<Sparkles size={17} />}
              >
                {isLoadingTree ? 'Preparing Assessment...' : `Start ${selectedMode === 'flashcards' ? 'Flashcard Drill' : 'Assessment'}`}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => navigateTo('learning', activeSubjectId)}
                leftIcon={<BookOpen size={16} />}
              >
                Explore Knowledge Tree
              </Button>
            </div>
          </div>

          {/* Past Attempts History */}
          {history.length > 0 && (
            <div className="recent-attempts-section">
              <h2 className="setup-section-title">
                <Clock size={16} style={{ color: 'var(--text-tertiary)' }} />
                Assessment History
              </h2>

              <div className="attempts-table-card">
                <table className="attempts-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Mode</th>
                      <th>Score</th>
                      <th>Questions</th>
                      <th>Time</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 5).map((att) => (
                      <tr key={att.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{att.subjectName}</td>
                        <td style={{ textTransform: 'capitalize' }}>{att.mode.replace('-', ' ')}</td>
                        <td>
                          <Badge
                            variant={att.scorePercentage >= 80 ? 'success' : att.scorePercentage >= 60 ? 'warning' : 'danger'}
                            size="sm"
                          >
                            {att.scorePercentage}%
                          </Badge>
                        </td>
                        <td>
                          {att.correctCount} / {att.totalQuestions}
                        </td>
                        <td>{Math.round(att.timeSpentSeconds)}s</td>
                        <td>{new Date(att.timestamp).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* View State: ACTIVE QUIZ */}
      {viewState === 'quiz' && currentQuestion && (
        <div className="active-quiz-view">
          {/* Top Bar */}
          <div className="quiz-top-bar">
            <div className="quiz-meta-info">
              <Badge variant="neutral" size="md">
                {currentQuestion.topicName}
              </Badge>
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="quiz-timer-badge">
                <Clock size={14} style={{ color: 'var(--accent-600)' }} />
                <span>{formattedTime}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm('Are you sure you want to exit? Your progress in this quiz will be lost.')) {
                    setIsTimerActive(false);
                    setViewState('overview');
                  }
                }}
              >
                Exit
              </Button>
            </div>
          </div>

          {/* Progress Track */}
          <div className="quiz-progress-track">
            <div
              className="quiz-progress-bar"
              style={{
                width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>

          {/* Question Container Card */}
          <div className="question-container-card">
            <div className="question-tags-row">
              <Badge
                variant={
                  currentQuestion.difficulty === 'foundational'
                    ? 'neutral'
                    : currentQuestion.difficulty === 'core'
                    ? 'outline'
                    : 'warning'
                }
                size="sm"
              >
                {currentQuestion.difficulty.toUpperCase()}
              </Badge>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-700)' }}>
                Concept: {currentQuestion.conceptName}
              </span>
            </div>

            <h2 className="question-text">{currentQuestion.question}</h2>

            {/* Options List */}
            <div className="options-list">
              {currentQuestion.options.map((optionText, idx) => {
                const isSelected = selectedOption === idx;
                const answered = answers[currentQuestion.id];
                const showInstantResult = instantFeedback && answered;
                const isCorrectOption = idx === currentQuestion.correctIndex;
                const isWrongSelection = isSelected && !isCorrectOption;

                let optionStateClass = '';
                if (showInstantResult) {
                  if (isCorrectOption) optionStateClass = 'is-correct';
                  else if (isWrongSelection) optionStateClass = 'is-incorrect';
                } else if (isSelected) {
                  optionStateClass = 'is-selected';
                }

                const optionLetter = String.fromCharCode(65 + idx);

                return (
                  <button
                    key={idx}
                    type="button"
                    className={`option-btn ${optionStateClass}`}
                    onClick={() => handleSelectOption(idx)}
                    disabled={showInstantResult && Boolean(answered)}
                  >
                    <div className="option-indicator">{optionLetter}</div>
                    <div className="option-content">{optionText}</div>
                  </button>
                );
              })}
            </div>

            {/* Instant Feedback Box */}
            {instantFeedback && answers[currentQuestion.id] && (
              <div
                className={`question-feedback-box ${
                  answers[currentQuestion.id].isCorrect ? 'correct' : 'incorrect'
                }`}
              >
                <div className="feedback-header">
                  {answers[currentQuestion.id].isCorrect ? (
                    <>
                      <Check size={18} />
                      <span>Correct Answer!</span>
                    </>
                  ) : (
                    <>
                      <X size={18} />
                      <span>Incorrect — Correct Answer: Option {String.fromCharCode(65 + currentQuestion.correctIndex)}</span>
                    </>
                  )}
                </div>

                <p className="feedback-text">{currentQuestion.explanation}</p>

                <div className="feedback-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleOpenTutor(
                        currentQuestion.conceptId,
                        currentQuestion.conceptName,
                        currentQuestion.topicName
                      )
                    }
                    leftIcon={<Bot size={14} />}
                  >
                    Ask AI Tutor About This Concept
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleConceptMastery(currentQuestion.conceptId)}
                    leftIcon={<CheckCircle2 size={14} />}
                  >
                    {completedConceptIds.has(currentQuestion.conceptId)
                      ? 'Marked as Mastered'
                      : 'Mark Concept as Mastered'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="quiz-nav-footer">
            <Button
              variant="outline"
              size="md"
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              leftIcon={<ArrowLeft size={16} />}
            >
              Previous
            </Button>

            <div style={{ display: 'flex', gap: 10 }}>
              {currentQuestionIndex < questions.length - 1 ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleNextQuestion}
                  disabled={selectedOption === null && !answers[currentQuestion.id]}
                  rightIcon={<ArrowRight size={16} />}
                >
                  Next Question
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleFinishQuiz}
                  disabled={selectedOption === null && !answers[currentQuestion.id]}
                  rightIcon={<Award size={16} />}
                >
                  Finish & Grade Exam
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View State: FLASHCARDS */}
      {viewState === 'flashcards' && currentCard && (
        <div className="flashcards-view" style={{ textAlign: 'center' }}>
          <div className="quiz-top-bar" style={{ maxWidth: 680, margin: '0 auto 20px' }}>
            <Badge variant="neutral" size="md">
              {currentCard.topicName}
            </Badge>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
              Card {currentCardIndex + 1} of {flashcards.length}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setViewState('overview')}>
              Exit
            </Button>
          </div>

          {/* 3D Flip Card */}
          <div className="flashcard-wrapper" onClick={() => setIsCardFlipped((prev) => !prev)}>
            <div className={`flashcard-inner ${isCardFlipped ? 'is-flipped' : ''}`}>
              {/* Front Face */}
              <div className="flashcard-face flashcard-front">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge variant="outline" size="sm">
                    {currentCard.topicName}
                  </Badge>
                  {completedConceptIds.has(currentCard.id) && (
                    <Badge variant="success" size="sm">
                      Mastered
                    </Badge>
                  )}
                </div>

                <div style={{ margin: 'auto 0' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-600)', textTransform: 'uppercase' }}>
                    Concept Term
                  </span>
                  <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: '8px 0 16px' }}>
                    {currentCard.name}
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto' }}>
                    <strong>Objective:</strong> {currentCard.learningObjective}
                  </p>
                </div>

                <div className="flashcard-hint">
                  Click card or press <strong>Space</strong> to reveal definition & keywords
                </div>
              </div>

              {/* Back Face */}
              <div className="flashcard-face flashcard-back">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-700)' }}>
                    Verified Explanation
                  </span>
                  <Badge variant="outline" size="sm">
                    {currentCard.name}
                  </Badge>
                </div>

                <div style={{ margin: 'auto 0', textAlign: 'left' }}>
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: 16 }}>
                    {currentCard.summary}
                  </p>

                  {currentCard.keywords && currentCard.keywords.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {currentCard.keywords.map((kw, i) => (
                        <Badge key={i} variant="neutral" size="sm">
                          #{kw}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenTutor(currentCard.id, currentCard.name, currentCard.topicName);
                    }}
                    leftIcon={<Bot size={14} />}
                  >
                    Ask AI Tutor
                  </Button>

                  <Button
                    variant={completedConceptIds.has(currentCard.id) ? 'primary' : 'outline'}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleConceptMastery(currentCard.id);
                    }}
                    leftIcon={<CheckCircle2 size={14} />}
                  >
                    {completedConceptIds.has(currentCard.id) ? 'Mastered' : 'Mark as Mastered'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Flashcard Navigation */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                if (currentCardIndex > 0) {
                  setCurrentCardIndex((prev) => prev - 1);
                  setIsCardFlipped(false);
                }
              }}
              disabled={currentCardIndex === 0}
              leftIcon={<ArrowLeft size={16} />}
            >
              Previous Card
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={() => {
                if (currentCardIndex < flashcards.length - 1) {
                  setCurrentCardIndex((prev) => prev + 1);
                  setIsCardFlipped(false);
                } else {
                  setViewState('overview');
                  showToast({ type: 'success', title: 'Deck Finished!', message: 'You reviewed all flashcards in this subject.' });
                }
              }}
              rightIcon={<ArrowRight size={16} />}
            >
              {currentCardIndex < flashcards.length - 1 ? 'Next Card' : 'Finish Deck'}
            </Button>
          </div>
        </div>
      )}

      {/* View State: RESULTS */}
      {viewState === 'results' && (
        <div className="assessment-results-card">
          {(() => {
            let correct = 0;
            questions.forEach((q) => {
              if (answers[q.id]?.isCorrect) correct++;
            });
            const pct = Math.round((correct / questions.length) * 100);

            return (
              <>
                <div
                  className="results-score-circle"
                  style={{ '--score-pct': pct } as React.CSSProperties}
                >
                  <div className="score-text-inner">
                    {pct}
                    <span className="score-pct-symbol">%</span>
                  </div>
                </div>

                <h2 className="results-grade-title">
                  {pct >= 85
                    ? 'Outstanding Mastery! 🎉'
                    : pct >= 70
                    ? 'Good Progress! 👍'
                    : 'Needs Conceptual Review 💡'}
                </h2>

                <p className="results-grade-desc">
                  You answered {correct} out of {questions.length} questions correctly in {formattedTime}. Review
                  the diagnostic analysis below to target any missed concepts.
                </p>

                {/* Metrics Bar */}
                <div className="results-metrics-bar">
                  <div className="metric-item">
                    <span className="metric-item-num" style={{ color: '#059669' }}>
                      {correct}
                    </span>
                    <span className="metric-item-label">Correct</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-item-num" style={{ color: '#dc2626' }}>
                      {questions.length - correct}
                    </span>
                    <span className="metric-item-label">Incorrect</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-item-num">{formattedTime}</span>
                    <span className="metric-item-label">Time Taken</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-item-num">{questions.length}</span>
                    <span className="metric-item-label">Evaluated</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
                  <Button variant="primary" size="md" onClick={handleStartAssessment} leftIcon={<RotateCcw size={16} />}>
                    Retake Assessment
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => navigateTo('learning', activeSubjectId)}
                    leftIcon={<BookOpen size={16} />}
                  >
                    View in Knowledge Tree
                  </Button>
                  <Button variant="ghost" size="md" onClick={() => setViewState('overview')}>
                    Back to Overview
                  </Button>
                </div>

                {/* Detailed Solutions Breakdown */}
                <div className="breakdown-section">
                  <h3 className="breakdown-title">Diagnostic Concept Breakdown</h3>

                  {questions.map((q, idx) => {
                    const ans = answers[q.id];
                    const isCorrect = ans?.isCorrect ?? false;
                    const selectedIdx = ans?.selectedOption ?? -1;

                    return (
                      <div key={q.id} className={`breakdown-item ${isCorrect ? '' : 'is-missed'}`}>
                        <div className="breakdown-item-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Badge variant={isCorrect ? 'success' : 'danger'} size="sm">
                              Q{idx + 1}: {isCorrect ? 'Correct' : 'Missed'}
                            </Badge>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                              {q.conceptName} ({q.topicName})
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenTutor(q.conceptId, q.conceptName, q.topicName)}
                              leftIcon={<Bot size={13} />}
                            >
                              Tutor
                            </Button>
                          </div>
                        </div>

                        <div className="breakdown-q-text">{q.question}</div>

                        <div className="breakdown-ans-compare">
                          <div>
                            <strong>Your Answer:</strong>{' '}
                            <span style={{ color: isCorrect ? '#059669' : '#dc2626' }}>
                              {selectedIdx >= 0 ? q.options[selectedIdx] : 'No answer provided'}
                            </span>
                          </div>
                          {!isCorrect && (
                            <div style={{ marginTop: 4, color: '#059669' }}>
                              <strong>Correct Answer:</strong> {q.options[q.correctIndex]}
                            </div>
                          )}
                          <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                            <strong>Explanation:</strong> {q.explanation}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Interactive AI Tutor Modal Bridge */}
      {tutorConcept && (
        <InteractiveTutorModal
          isOpen={tutorModalOpen}
          conceptId={tutorConcept.id}
          topicName={tutorConcept.topicName}
          subjectName={currentSubject ? formatSubjectTitle(currentSubject.name) : undefined}
          onClose={() => setTutorModalOpen(false)}
          onProgressChanged={(_cId: number, completed: boolean) => {
            setCompletedConceptIds((prev) => {
              const next = new Set(prev);
              if (completed) next.add(tutorConcept.id);
              else next.delete(tutorConcept.id);
              return next;
            });
          }}
        />
      )}
    </div>
  );
};
