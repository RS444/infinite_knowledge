import { apiFetch, ApiClientError } from './client';
import type { DocumentUploadResponse, ProcessDocumentResponse } from '../types/api';

const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export interface UploadProgressCallback {
  (percentage: number): void;
}

/**
 * Upload a study document (PDF or DOCX, max 10MB)
 * POST /documents/upload
 * Field name: 'file'
 */
export async function uploadDocument(
  file: File,
  subjectName?: string,
  onProgress?: UploadProgressCallback
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (subjectName && subjectName.trim()) {
    formData.append('subject_name', subjectName.trim());
  }

  const primaryUrl = RAW_BASE_URL ? `${RAW_BASE_URL}/documents/upload` : '/documents/upload';
  const fallbackUrl = '/documents/upload';

  const performXhr = (url: string): Promise<DocumentUploadResponse> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const parsed = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(parsed as DocumentUploadResponse);
          } else {
            const errorMsg = parsed.detail || parsed.message || `Upload failed with status ${xhr.status}`;
            reject(new ApiClientError(errorMsg, xhr.status, parsed.detail));
          }
        } catch {
          if (xhr.status >= 200 && xhr.status < 300) {
            reject(new ApiClientError('Invalid server response format', xhr.status));
          } else {
            reject(new ApiClientError(`Upload failed with status ${xhr.status}`, xhr.status));
          }
        }
      };

      xhr.onerror = () => {
        reject(new ApiClientError('Network error during file upload'));
      };

      xhr.ontimeout = () => {
        reject(new ApiClientError('Upload request timed out', 408));
      };

      xhr.timeout = 60000; // 60s timeout for document upload
      xhr.send(formData);
    });
  };

  try {
    return await performXhr(primaryUrl);
  } catch (err: unknown) {
    // If failed via primary and primary was different from fallback, try proxy fallback
    if (RAW_BASE_URL && (err as ApiClientError)?.status === undefined) {
      try {
        return await performXhr(fallbackUrl);
      } catch {
        throw err;
      }
    }
    throw err;
  }
}

/**
 * Trigger the knowledge extraction pipeline for an uploaded document
 * POST /documents/{document_id}/process
 */
export async function processDocument(
  documentId: number,
  subjectName?: string,
  signal?: AbortSignal
): Promise<ProcessDocumentResponse> {
  const cleanSubjectName = subjectName?.trim();
  return apiFetch<ProcessDocumentResponse>(`/documents/${documentId}/process`, {
    method: 'POST',
    headers: cleanSubjectName ? { 'Content-Type': 'application/json' } : undefined,
    body: cleanSubjectName ? JSON.stringify({ subject_name: cleanSubjectName }) : undefined,
    signal,
    timeoutMs: 600000, // 10 min timeout for LLM inference on large documents
  });
}
