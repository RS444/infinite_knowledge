import { apiFetch } from './client';
import type {
  ConceptTutorContext,
  TutorChatResponse,
  ConceptProgressResponse,
  SubjectProgressResponse,
} from '../types/api';

/**
 * Fetch complete tutor context for a concept, including metadata,
 * grounded source excerpts, conversation history, and current completion progress.
 */
export async function getConceptTutorContext(conceptId: number): Promise<ConceptTutorContext> {
  return apiFetch<ConceptTutorContext>(`/concepts/${conceptId}/tutor`);
}

/**
 * Send a message or learning prompt to the AI tutor.
 * Uses a generous 60s timeout to allow local Ollama generation to complete reliably.
 */
export async function sendTutorMessage(
  conceptId: number,
  message: string
): Promise<TutorChatResponse> {
  return apiFetch<TutorChatResponse>(`/concepts/${conceptId}/tutor/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    timeoutMs: 120000,
  });
}

/**
 * Reset and clear previous conversation messages for a concept.
 */
export async function resetTutorConversation(
  conceptId: number
): Promise<{ message: string; concept_id: number }> {
  return apiFetch<{ message: string; concept_id: number }>(`/concepts/${conceptId}/tutor/reset`, {
    method: 'POST',
  });
}

/**
 * Fetch persistent completion state for a concept.
 */
export async function getConceptProgress(conceptId: number): Promise<ConceptProgressResponse> {
  return apiFetch<ConceptProgressResponse>(`/concepts/${conceptId}/progress`);
}

/**
 * Update and persist completion state for a concept in PostgreSQL.
 */
export async function setConceptProgress(
  conceptId: number,
  completed: boolean
): Promise<ConceptProgressResponse> {
  return apiFetch<ConceptProgressResponse>(`/concepts/${conceptId}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
}

/**
 * Fetch aggregated topic and subject learning progress derived from PostgreSQL records.
 */
export async function getSubjectProgress(subjectId: number): Promise<SubjectProgressResponse> {
  return apiFetch<SubjectProgressResponse>(`/subjects/${subjectId}/progress`);
}
