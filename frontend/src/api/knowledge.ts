import { apiFetch } from './client';
import type { KnowledgeTreeResponse, Concept } from '../types/api';

/**
 * Fetch the complete hierarchical knowledge tree for a subject
 * GET /subjects/{subject_id}/knowledge-tree
 */
export async function getKnowledgeTree(
  subjectId: number,
  signal?: AbortSignal
): Promise<KnowledgeTreeResponse> {
  return apiFetch<KnowledgeTreeResponse>(`/subjects/${subjectId}/knowledge-tree`, {
    method: 'GET',
    signal,
  });
}

/**
 * Fetch a single concept with its source references
 * GET /concepts/{concept_id}
 */
export async function getConcept(
  conceptId: number,
  signal?: AbortSignal
): Promise<Concept> {
  return apiFetch<Concept>(`/concepts/${conceptId}`, {
    method: 'GET',
    signal,
  });
}
