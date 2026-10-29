/**
 * Subject Name Formatting Utilities
 * Handles raw backend identifiers safely and honestly without inventing fake course titles.
 */

import type { Subject, KnowledgeTreeSubjectInfo } from '../types/api';

/**
 * Formats a subject's display title.
 * If the name is purely numeric (such as a timestamp-based filename e.g. '1692335449609'),
 * it formats it clearly as 'Document 1692335449609'.
 * If the name is already a descriptive title, it returns it as-is.
 */
export function formatSubjectTitle(name?: string | null, documentId?: number | null): string {
  if (!name || !name.trim()) {
    return documentId ? `Document #${documentId}` : 'Untitled Subject';
  }

  const trimmed = name.trim();

  // If the name is purely numeric (like 1692335449609)
  if (/^\d+$/.test(trimmed)) {
    return `Document ${trimmed}`;
  }

  return trimmed;
}

/**
 * Returns a readable subtitle displaying Document ID and Subject ID.
 */
export function formatSubjectSubtitle(
  subject: Subject | KnowledgeTreeSubjectInfo | null | undefined
): string {
  if (!subject) return '';
  return `Document #${subject.document_id} • Subject #${subject.id}`;
}
