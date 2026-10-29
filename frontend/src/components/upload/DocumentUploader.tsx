import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  FileCheck,
  Cpu,
  Layers,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { uploadDocument } from '../../api/documents';
import type { DocumentUploadResponse } from '../../types/api';
import './DocumentUploader.css';

interface DocumentUploaderProps {
  onUploadSuccess: (
    uploadResult: DocumentUploadResponse,
    file: File,
    subjectName: string
  ) => void;
  isProcessing?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onUploadSuccess,
  isProcessing = false,
}) => {
  const [subjectName, setSubjectName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return 'Only PDF and DOCX documents are supported.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File exceeds the 10MB limit (${formatFileSize(file.size)}).`;
    }
    if (file.size === 0) {
      return 'The selected file is empty.';
    }
    return null;
  };

  const handleFileSelection = (file: File) => {
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setSelectedFile(null);
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);

    // Auto-populate subject name from file name if user hasn't typed one
    if (!subjectName.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      setSubjectName(baseName);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    },
    [subjectName]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadAndProcess = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a study material document to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      const result = await uploadDocument(
        selectedFile,
        subjectName.trim() || undefined,
        (percent) => {
          setUploadProgress(percent);
        }
      );

      setIsUploading(false);
      onUploadSuccess(result, selectedFile, subjectName.trim());
    } catch (err: unknown) {
      setIsUploading(false);
      const msg =
        (err as Error)?.message ||
        'Failed to upload the study material. Please check that the backend is active.';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="uploader-container">
      {/* Subject Name Input Group */}
      <div className="uploader-subject-name-group">
        <label className="uploader-subject-label" htmlFor="subject-name-input">
          Subject / Course Title
        </label>
        <input
          id="subject-name-input"
          type="text"
          className="uploader-subject-input"
          placeholder="e.g. Machine Learning Fundamentals, Database Systems"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          disabled={isUploading || isProcessing}
        />
        <div className="uploader-subject-hint">
          Name the target knowledge tree subject. If left empty, the file name will be used.
        </div>
      </div>

      {/* Dropzone Area (shown when no file is selected) */}
      {!selectedFile ? (
        <div
          className={`dropzone ${isDragging ? 'is-dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          tabIndex={0}
          role="button"
          aria-label="Upload document dropzone"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />
          <div className="dropzone-icon-box">
            <UploadCloud size={28} />
          </div>
          <div className="dropzone-title">Click to upload or drag & drop</div>
          <div className="dropzone-sub">
            Supported formats: PDF or DOCX (up to 10 MB). Scanned documents with searchable text work best.
          </div>
        </div>
      ) : (
        /* Selected File Card */
        <div className="selected-file-card animate-fade-in">
          <div className="file-card-header">
            <div className="file-info-left">
              <div className="file-type-icon">
                <FileText size={24} />
              </div>
              <div className="file-details">
                <div className="file-name" title={selectedFile.name}>
                  {selectedFile.name}
                </div>
                <div className="file-size">{formatFileSize(selectedFile.size)}</div>
              </div>
            </div>

            {!isUploading && !isProcessing && (
              <button
                type="button"
                className="file-remove-btn"
                onClick={handleRemoveFile}
                title="Remove selected file"
                aria-label="Remove selected file"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="progress-container">
              <div className="progress-labels">
                <span className="progress-status">Uploading file to server...</span>
                <span className="progress-percentage">{uploadProgress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Actions Row */}
          <div className="file-actions-row">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRemoveFile}
              disabled={isUploading || isProcessing}
            >
              Choose Different File
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleUploadAndProcess}
              isLoading={isUploading}
              disabled={isProcessing}
              rightIcon={<ArrowRight size={14} />}
            >
              Upload & Generate Tree
            </Button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="uploader-error-alert animate-fade-in">
          <AlertCircle size={18} className="alert-icon" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Specifications Card */}
      <div className="uploader-specifications">
        <div className="spec-title">Pipeline Specifications & Architecture</div>
        <div className="spec-grid">
          <div className="spec-item">
            <FileCheck size={18} className="spec-icon" />
            <div>
              <div className="spec-heading">Supported Formats</div>
              <div className="spec-sub">
                PDF and Microsoft Word (.docx) files up to 10 MB with text layers.
              </div>
            </div>
          </div>

          <div className="spec-item">
            <Cpu size={18} className="spec-icon" />
            <div>
              <div className="spec-heading">Local LLM Extraction</div>
              <div className="spec-sub">
                Processed privately on-device via Ollama (Qwen 3) with zero data leak.
              </div>
            </div>
          </div>

          <div className="spec-item">
            <ShieldCheck size={18} className="spec-icon" />
            <div>
              <div className="spec-heading">Grounded Citations</div>
              <div className="spec-sub">
                Every extracted concept stores exact character offsets to the original text.
              </div>
            </div>
          </div>

          <div className="spec-item">
            <Layers size={18} className="spec-icon" />
            <div>
              <div className="spec-heading">Knowledge Deduplication</div>
              <div className="spec-sub">
                Multi-chunk topics and concepts are merged into clean, hierarchical trees.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

