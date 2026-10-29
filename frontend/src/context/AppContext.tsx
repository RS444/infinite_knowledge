import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { listSubjects } from '../api/subjects';
import type { HealthResponse, Subject, DocumentUploadResponse } from '../types/api';

export type PageId =
  | 'dashboard'
  | 'learning'
  | 'upload'
  | 'assessments'
  | 'progress'
  | 'settings'
  // Legacy aliases mapped smoothly to 'learning'
  | 'subjects'
  | 'tree'
  | 'roadmap';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface AppContextValue {
  currentPage: PageId;
  subjects: Subject[];
  isLoadingSubjects: boolean;
  subjectsError: string | null;
  recentUploads: DocumentUploadResponse[];
  selectedSubjectId: number | null;
  selectedConceptId: number | null;
  backendStatus: 'online' | 'offline' | 'loading';
  mobileNavOpen: boolean;
  toasts: ToastMessage[];
  navigateTo: (page: PageId, subjectId?: number | null, conceptId?: number | null) => void;
  setSelectedSubjectId: (id: number | null) => void;
  setSelectedConceptId: (id: number | null) => void;
  setMobileNavOpen: (open: boolean) => void;
  refreshSubjects: () => Promise<Subject[]>;
  addRecentUpload: (doc: DocumentUploadResponse) => void;
  checkBackendHealth: () => Promise<void>;
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(true);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [recentUploads, setRecentUploads] = useState<DocumentUploadResponse[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<number | null>(null);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const checkBackendHealth = useCallback(async () => {
    try {
      setBackendStatus('loading');
      const res = await apiFetch<HealthResponse>('/health', { timeoutMs: 4000 });
      if (res && res.status === 'healthy') {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch {
      setBackendStatus('offline');
    }
  }, []);

  const refreshSubjects = useCallback(async (): Promise<Subject[]> => {
    setIsLoadingSubjects(true);
    setSubjectsError(null);
    try {
      const res = await listSubjects();
      const list = res.subjects || [];
      setSubjects(list);
      return list;
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to fetch subjects from the backend.';
      setSubjectsError(msg);
      return [];
    } finally {
      setIsLoadingSubjects(false);
    }
  }, []);

  useEffect(() => {
    checkBackendHealth();
    refreshSubjects();
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, [checkBackendHealth, refreshSubjects]);

  const addRecentUpload = useCallback((doc: DocumentUploadResponse) => {
    setRecentUploads((prev) => [doc, ...prev.filter((d) => d.document_id !== doc.document_id)]);
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const navigateTo = useCallback(
    (page: PageId, subjectId?: number | null, conceptId?: number | null) => {
      // Map legacy redundant routes directly to 'learning'
      const targetPage: PageId =
        page === 'subjects' || page === 'tree' || page === 'roadmap' ? 'learning' : page;

      setCurrentPage(targetPage);

      if (subjectId !== undefined) {
        setSelectedSubjectId(subjectId);
      }
      if (conceptId !== undefined) {
        setSelectedConceptId(conceptId);
      }
      setMobileNavOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  return (
    <AppContext.Provider
      value={{
        currentPage,
        subjects,
        isLoadingSubjects,
        subjectsError,
        recentUploads,
        selectedSubjectId,
        selectedConceptId,
        backendStatus,
        mobileNavOpen,
        toasts,
        navigateTo,
        setSelectedSubjectId,
        setSelectedConceptId,
        setMobileNavOpen,
        refreshSubjects,
        addRecentUpload,
        checkBackendHealth,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

