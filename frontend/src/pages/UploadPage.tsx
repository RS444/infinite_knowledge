import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BookOpen, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { DocumentUploader } from '../components/upload/DocumentUploader';
import { KnowledgeGenerationView } from '../components/upload/KnowledgeGenerationView';
import { UploadSuccessCard } from '../components/upload/UploadSuccessCard';
import { processDocument } from '../api/documents';
import type { DocumentUploadResponse, ProcessDocumentResponse } from '../types/api';

type UploadStep = 'upload' | 'generating' | 'success' | 'error';

export const UploadPage: React.FC = () => {
  const { navigateTo, addRecentUpload, refreshSubjects, showToast } = useApp();

  const [currentStep, setCurrentStep] = useState<UploadStep>('upload');
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [activeSubjectName, setActiveSubjectName] = useState<string>('');
  const [uploadedDoc, setUploadedDoc] = useState<DocumentUploadResponse | null>(null);
  const [generationStage, setGenerationStage] = useState<number>(2);
  const [processResult, setProcessResult] = useState<ProcessDocumentResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const triggerDocumentProcessing = async (
    docId: number,
    subjName: string
  ) => {
    setCurrentStep('generating');
    setGenerationStage(2);
    setErrorMessage(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Advance stage tracker smoothly while waiting for local LLM
    const stageTimer1 = setTimeout(() => setGenerationStage(2), 2000);
    const stageTimer2 = setTimeout(() => setGenerationStage(3), 35000);
    const stageTimer3 = setTimeout(() => setGenerationStage(4), 70000);

    try {
      const result = await processDocument(docId, subjName, controller.signal);

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);

      setProcessResult(result);
      setCurrentStep('success');

      // Refresh global subjects list in background
      refreshSubjects();

      showToast({
        type: 'success',
        title: result.status === 'already_processed' ? 'Subject Already Ready' : 'Knowledge Tree Ready',
        message: result.message || `Processed ${result.concept_count} concepts.`,
      });
    } catch (err: unknown) {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);

      if ((err as Error)?.name === 'AbortError') {
        setCurrentStep('upload');
        showToast({
          type: 'info',
          title: 'Extraction Cancelled',
          message: 'Document processing was stopped.',
        });
        return;
      }

      const msg =
        (err as Error)?.message ||
        'An unexpected error occurred during knowledge extraction. Please ensure Ollama is running and retry.';
      setErrorMessage(msg);
      setCurrentStep('error');

      showToast({
        type: 'error',
        title: 'Extraction Failed',
        message: msg,
      });
    }
  };

  const handleUploadSuccess = (
    result: DocumentUploadResponse,
    file: File,
    subjectName: string
  ) => {
    setUploadedDoc(result);
    setActiveFile(file);
    setActiveSubjectName(subjectName);
    addRecentUpload(result);

    // Automatically trigger knowledge tree generation
    triggerDocumentProcessing(result.document_id, subjectName);
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setCurrentStep('upload');
  };

  const handleRetryProcessing = () => {
    if (uploadedDoc) {
      triggerDocumentProcessing(
        uploadedDoc.document_id,
        activeSubjectName
      );
    } else {
      setCurrentStep('upload');
    }
  };

  const handleResetToUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setCurrentStep('upload');
    setActiveFile(null);
    setActiveSubjectName('');
    setUploadedDoc(null);
    setProcessResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="upload-page-container animate-fade-in" style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25 }}>
            Upload Study Material
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Ingest textbooks, lecture notes, or syllabus documents to extract verifiable knowledge trees.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigateTo('subjects')}
          leftIcon={<BookOpen size={14} />}
        >
          View Subjects
        </Button>
      </div>

      {/* Main Content Area by Step */}
      {currentStep === 'upload' && (
        <DocumentUploader onUploadSuccess={handleUploadSuccess} />
      )}

      {currentStep === 'generating' && (
        <KnowledgeGenerationView
          fileName={activeFile?.name || uploadedDoc?.filename || 'Document'}
          subjectName={activeSubjectName}
          stage={generationStage}
          onCancel={handleCancelGeneration}
        />
      )}

      {currentStep === 'success' && processResult && (
        <UploadSuccessCard
          result={processResult}
          fileName={activeFile?.name || uploadedDoc?.filename || 'Document'}
          onExploreKnowledgeTree={(subjId) => navigateTo('learning', subjId)}
          onUploadAnother={handleResetToUpload}
          onViewAllSubjects={() => navigateTo('subjects')}
        />
      )}

      {currentStep === 'error' && (
        <div
          className="animate-fade-in"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <AlertCircle size={28} />
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Knowledge Extraction Failed
          </h2>

          <p
            style={{
              fontSize: 13.5,
              color: 'var(--danger-text)',
              maxWidth: 520,
              margin: '0 auto 20px',
              padding: '12px 16px',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              lineHeight: 1.45,
            }}
          >
            {errorMessage || 'An error occurred while communicating with the local LLM.'}
          </p>

          <div
            style={{
              fontSize: 12.5,
              color: 'var(--text-secondary)',
              maxWidth: 480,
              margin: '0 auto 24px',
              lineHeight: 1.5,
            }}
          >
            Your document was uploaded successfully as Document #{uploadedDoc?.document_id}.
            Ensure that <strong>Ollama is running</strong> with the <code>qwen3:4b</code> model and that PostgreSQL is active.
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button
              variant="primary"
              size="md"
              onClick={handleRetryProcessing}
              leftIcon={<RefreshCw size={15} />}
            >
              Retry Knowledge Extraction
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={handleResetToUpload}
              leftIcon={<ArrowLeft size={15} />}
            >
              Upload Different Document
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
