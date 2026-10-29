import React, { useState, useEffect } from 'react';
import type { Subject } from '../../types/api';
import { formatSubjectTitle } from '../../utils/subjectFormat';
import { renameSubject } from '../../api/subjects';
import { Button } from '../ui/Button';
import { Edit3, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import './RenameSubjectModal.css';

interface RenameSubjectModalProps {
  isOpen: boolean;
  subject: Subject | null;
  onClose: () => void;
  onRenamed?: () => void;
}

export const RenameSubjectModal: React.FC<RenameSubjectModalProps> = ({
  isOpen,
  subject,
  onClose,
  onRenamed,
}) => {
  const [newName, setNewName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize input when modal opens
  useEffect(() => {
    if (isOpen && subject) {
      setNewName(subject.name || '');
      setIsSubmitting(false);
      setValidationError(null);
      setServerError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, subject]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  if (!isOpen || !subject) {
    return null;
  }

  const currentDisplayTitle = formatSubjectTitle(subject.name, subject.document_id);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const trimmed = newName.trim();
    if (!trimmed) {
      setValidationError('Subject name cannot be empty.');
      return;
    }

    if (trimmed === subject.name) {
      setValidationError('The new name is identical to the current name.');
      return;
    }

    setValidationError(null);
    setServerError(null);
    setIsSubmitting(true);

    try {
      await renameSubject(subject.id, trimmed);

      setSuccessMessage(`Subject renamed to "${trimmed}" successfully.`);
      if (onRenamed) {
        onRenamed();
      }

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1000);
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = (err as Error)?.message || 'Failed to rename subject.';
      setServerError(msg);
    }
  };

  return (
    <div
      className="rename-modal-overlay animate-fade-in"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      role="presentation"
    >
      <div
        className="rename-modal-card animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-dialog-title"
      >
        {/* Header */}
        <div className="rename-modal-header">
          <div className="rename-icon-wrapper" aria-hidden="true">
            <Edit3 size={18} />
          </div>
          <div className="rename-header-texts">
            <h2 id="rename-dialog-title" className="rename-modal-title">
              Rename Subject
            </h2>
            <p className="rename-modal-subtitle">
              Update the display title for this learning unit.
            </p>
          </div>
          <button
            type="button"
            className="rename-modal-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="rename-modal-body">
          {/* Target Info */}
          <div className="rename-target-info">
            <span className="rename-current-title" title={currentDisplayTitle}>
              Subject: <strong>{currentDisplayTitle}</strong>
            </span>
          </div>

          {/* Input field */}
          <div className="rename-field-group">
            <label htmlFor="rename-subject-input" className="rename-field-label">
              New Subject Name <span className="field-required">*</span>
            </label>
            <input
              id="rename-subject-input"
              type="text"
              className={`rename-text-input ${validationError ? 'is-invalid' : ''}`}
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (validationError && e.target.value.trim()) {
                  setValidationError(null);
                }
              }}
              placeholder="e.g. Advanced Machine Learning, SQL Mastery"
              disabled={isSubmitting}
              autoFocus
            />
            {validationError && (
              <span className="rename-error-text" role="alert">
                {validationError}
              </span>
            )}
          </div>

          {/* Server Error Alert */}
          {serverError && (
            <div className="rename-error-alert animate-fade-in" role="alert">
              <AlertTriangle size={16} className="alert-icon" />
              <div className="alert-text">
                <strong>Operation Failed:</strong> {serverError}
              </div>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="rename-success-alert animate-fade-in" role="alert">
              <CheckCircle2 size={16} className="alert-icon" />
              <div className="alert-text">{successMessage}</div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="rename-modal-footer">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !newName.trim()}
              isLoading={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Name'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
