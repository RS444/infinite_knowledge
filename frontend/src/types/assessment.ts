/**
 * Assessment & Quiz Type Definitions for Infinite Knowledge
 */

export type AssessmentMode = 'quiz' | 'weak-areas' | 'flashcards';

export type QuestionDifficulty = 'foundational' | 'core' | 'applied';

export interface AssessmentQuestion {
  id: string;
  conceptId: number;
  conceptName: string;
  topicId: number;
  topicName: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  learningObjective: string;
  conceptSummary: string;
  keywords: string[];
  difficulty: QuestionDifficulty;
}

export interface QuestionAnswer {
  questionId: string;
  conceptId: number;
  selectedOption: number;
  isCorrect: boolean;
  timeTakenSeconds?: number;
}

export interface AssessmentAttempt {
  id: string;
  subjectId: number;
  subjectName: string;
  timestamp: string;
  mode: AssessmentMode;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  timeSpentSeconds: number;
  answers: QuestionAnswer[];
}

export interface ConceptFlashcard {
  id: number;
  name: string;
  topicName: string;
  subjectName: string;
  summary: string;
  learningObjective: string;
  keywords: string[];
  isCompleted: boolean;
}
