import { apiFetch, ApiClientError } from './client';
import type { Subject, SubjectsResponse } from '../types/api';

/**
 * Fetch all subjects registered in the system
 * GET /subjects
 */
export async function listSubjects(signal?: AbortSignal): Promise<SubjectsResponse> {
  return apiFetch<SubjectsResponse>('/subjects', {
    method: 'GET',
    signal,
  });
}

/**
 * Delete a subject by ID.
 * Attempts DELETE /subjects/{subject_id}.
 * Catches server errors (such as 404 Not Found or 405 Method Not Allowed)
 * and formats an informative, honest message without simulating success.
 */
export async function deleteSubject(subjectId: number): Promise<void> {
  try {
    return await apiFetch<void>(`/subjects/${subjectId}`, {
      method: 'DELETE',
    });
  } catch (err: unknown) {
    if (err instanceof ApiClientError) {
      if (err.status === 404) {
        if (err.detail && err.detail !== 'Not Found') {
          throw new ApiClientError(err.detail, 404, err.detail);
        }
        throw new ApiClientError(
          `Subject deletion endpoint is not available on the server (DELETE /subjects/${subjectId} returned 404).`,
          404,
          err.detail
        );
      }
      if (err.status === 405) {
        throw new ApiClientError(
          `DELETE method is not allowed on /subjects/${subjectId}.`,
          405,
          err.detail
        );
      }
      if (err.status === 409) {
        throw new ApiClientError(
          `Cannot delete subject #${subjectId} due to foreign-key dependencies: ${err.detail || err.message}`,
          409,
          err.detail
        );
      }
      throw err;
    }
    throw new ApiClientError(
      (err as Error)?.message || `Failed to delete subject #${subjectId}.`
    );
  }
}

/**
 * Rename a subject by ID.
 * Attempts PATCH /subjects/{subject_id} with { name: newName }.
 */
export async function renameSubject(subjectId: number, newName: string): Promise<Subject> {
  try {
    return await apiFetch<Subject>(`/subjects/${subjectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName }),
    });
  } catch (err: unknown) {
    if (err instanceof ApiClientError) {
      if (err.status === 404) {
        if (err.detail && err.detail !== 'Not Found') {
          throw new ApiClientError(err.detail, 404, err.detail);
        }
        throw new ApiClientError(
          `Subject renaming endpoint is not available on the server (PATCH /subjects/${subjectId} returned 404).`,
          404,
          err.detail
        );
      }
      if (err.status === 422) {
        throw new ApiClientError(
          err.detail || 'Invalid subject name provided.',
          422,
          err.detail
        );
      }
      if (err.status === 405) {
        throw new ApiClientError(
          `PATCH method is not allowed on /subjects/${subjectId}.`,
          405,
          err.detail
        );
      }
      throw err;
    }
    throw new ApiClientError(
      (err as Error)?.message || `Failed to rename subject #${subjectId}.`
    );
  }
}
