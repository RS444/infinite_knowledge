import React, { useState, useEffect } from 'react';
import type { Subject } from '../../types/api';
import { formatSubjectTitle } from '../../utils/subjectFormat';
import { deleteSubject } from '../../api/subjects';
import { Button } from '../ui/Button';
import {
  AlertTriangle,
  X,
  ShieldAlert,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import './DeleteSubjectModal.css';

interface DeleteSubjectModalProps {
  isOpen: boolean;
  subject: Subject | null;
  onClose: () => void;
  onDeleted?: () => void;
}

interface FeedbackState {
  type: 'error' | 'success';
  title: string;
  message: string;
  detail?: string;
}

export const DeleteSubjectModal: React.FC<DeleteSubjectModalProps> = ({
  isOpen,
  subject,
  onClose,
  onDeleted,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // Reset state whenever modal opens or subject changes
  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setFeedback(null);
    }
  }, [isOpen, subject]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !subject) {
    return null;
  }

  const formattedTitle = formatSubjectTitle(subject.name, subject.document_id);

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleConfirmDelete = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await deleteSubject(subject.id);

      // On successful deletion
      setFeedback({
        type: 'success',
        title: 'Subject Deleted',
        message: `"${subject.name}" was deleted successfully.`,
      });

      if (onDeleted) {
        onDeleted();
      }

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1000);
    } catch (err: unknown) {
      setIsSubmitting(false);
      const errorMessage = (err as Error)?.message || 'Failed to delete subject';

      setFeedback({
        type: 'error',
        title: 'Deletion Request Failed',
        message: errorMessage,
        detail:
          'The subject and its associated knowledge tree remain intact in the database. Deleting subjects requires a backend DELETE /subjects/{id} endpoint.',
      });
    }
  };

  return (
    <div
      className="delete-modal-overlay animate-fade-in"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="delete-modal-card animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        {/* Header */}
        <div className="delete-modal-header">
          <div className="delete-icon-wrapper" aria-hidden="true">
            <Trash2 size={20} />
          </div>
          <div className="delete-header-texts">
            <h2 id="delete-dialog-title" className="delete-modal-title">
              Delete Subject
            </h2>
            <p id="delete-dialog-description" className="delete-modal-subtitle">
              Are you sure you want to delete this subject from your learning catalog?
            </p>
          </div>
          <button
            type="button"
            className="delete-modal-close"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="delete-modal-body">
          {/* Target Subject Info Box */}
          <div className="delete-target-box">
            <div className="delete-target-title">{formattedTitle}</div>
          </div>

          {/* Cascading Deletion Warning */}
          <div className="delete-warning-banner" role="alert">
            <AlertTriangle size={18} className="warning-banner-icon" />
            <div className="warning-banner-content">
              <strong>Cascading Deletion Notice</strong>
              <p>
                Deleting this subject removes all associated topic groups,
                concepts, learning objectives, and source references from your study roadmap.
              </p>
            </div>
          </div>

          {/* Data Safety Note */}
          <div className="delete-safety-note">
            <ShieldAlert size={16} className="safety-note-icon" />
            <div className="safety-note-content">
              <strong>Document Retention:</strong> Document ID #{subject.document_id} in
              the uploaded documents table will remain preserved. Only the extracted subject roadmap is targeted.
            </div>
          </div>

          {/* Feedback Display (Error or Success) */}
          {feedback && (
            <div
              className={`delete-feedback-box feedback-${feedback.type} animate-fade-in`}
              role="alert"
            >
              {feedback.type === 'error' ? (
                <AlertTriangle size={18} className="feedback-icon" />
              ) : (
                <CheckCircle2 size={18} className="feedback-icon" />
              )}
              <div className="feedback-content">
                <div className="feedback-title">{feedback.title}</div>
                <div className="feedback-message">{feedback.message}</div>
                {feedback.detail && <div className="feedback-detail">{feedback.detail}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="delete-modal-footer">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={isSubmitting}
            isLoading={isSubmitting}
            leftIcon={<Trash2 size={15} />}
          >
            {isSubmitting ? 'Deleting...' : 'Delete Subject'}
          </Button>
        </div>
      </div>
    </div>
  );
};
