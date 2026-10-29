import React, { useState, useEffect, useRef } from 'react';
import {
  getConceptTutorContext,
  sendTutorMessage,
  resetTutorConversation,
  setConceptProgress,
} from '../../api/tutor';
import type { ConceptTutorContext, TutorMessage } from '../../types/api';
import {
  Sparkles,
  Send,
  Bot,
  User,
  CheckCircle2,
  Circle,
  HelpCircle,
  Lightbulb,
  AlignLeft,
  X,
  RotateCcw,
  Loader2,
  ArrowLeft,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Target,
} from 'lucide-react';
import './InteractiveTutorModal.css';

interface InteractiveTutorModalProps {
  conceptId: number;
  subjectName?: string;
  topicName?: string;
  isOpen: boolean;
  onClose: () => void;
  onProgressChanged?: (conceptId: number, completed: boolean) => void;
}

export const InteractiveTutorModal: React.FC<InteractiveTutorModalProps> = ({
  conceptId,
  subjectName,
  topicName,
  isOpen,
  onClose,
  onProgressChanged,
}) => {
  const [context, setContext] = useState<ConceptTutorContext | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSources, setShowSources] = useState<boolean>(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll conversation to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Fetch tutor context when concept changes or modal opens
  useEffect(() => {
    if (!isOpen || !conceptId) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    getConceptTutorContext(conceptId)
      .then((data) => {
        if (!isMounted) return;
        setContext(data);
        setMessages(data.messages || []);
        setIsCompleted(data.progress?.completed ?? false);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMessage(
          err?.message || 'Unable to connect to AI Tutor. Please ensure the backend is running.'
        );
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, conceptId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom(false);
  }, [messages, isSending]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && !isLoading) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isLoading]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend ?? inputText).trim();
    if (!message || isSending) return;

    setInputText('');
    setErrorMessage(null);
    setLastFailedMessage(null);
    setIsSending(true);

    // Optimistically append student message
    const tempStudentMsg: TutorMessage = {
      role: 'student',
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempStudentMsg]);

    try {
      const response = await sendTutorMessage(conceptId, message);
      const assistantMsg: TutorMessage = {
        role: 'assistant',
        content: response.content,
        created_at: response.created_at || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorText =
        (err as Error)?.message || 'Failed to receive a response from AI Tutor. Please try again.';
      setErrorMessage(errorText);
      setLastFailedMessage(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleToggleCompletion = async () => {
    if (isUpdatingProgress) return;
    setIsUpdatingProgress(true);
    const nextState = !isCompleted;

    try {
      await setConceptProgress(conceptId, nextState);
      setIsCompleted(nextState);
      onProgressChanged?.(conceptId, nextState);
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || 'Failed to update concept completion status.');
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const handleResetConversation = async () => {
    if (window.confirm('Are you sure you want to reset this tutor conversation?')) {
      try {
        await resetTutorConversation(conceptId);
        setMessages([]);
        setErrorMessage(null);
      } catch (err: unknown) {
        setErrorMessage((err as Error)?.message || 'Failed to reset conversation.');
      }
    }
  };

  const displaySubject = subjectName || context?.subject.name || 'Subject';
  const displayTopic = topicName || context?.topic.name || 'Topic';
  const displayConceptName = context?.concept.name || `Concept #${conceptId}`;

  return (
    <div className="tutor-modal-overlay" role="dialog" aria-modal="true">
      <div className="tutor-modal-window">
        {/* Header Bar */}
        <header className="tutor-modal-header">
          <div className="tutor-header-nav">
            <button
              className="tutor-back-btn"
              onClick={onClose}
              aria-label="Back to knowledge tree"
              title="Back to knowledge tree"
            >
              <ArrowLeft size={16} />
              <span>Knowledge Tree</span>
            </button>
            <span className="tutor-nav-divider">/</span>
            <span className="tutor-nav-topic" title={displayTopic}>
              {displayTopic}
            </span>
          </div>

          <div className="tutor-header-main">
            <div className="tutor-header-title-box">
              <span className="tutor-badge-ai">
                <Sparkles size={13} />
                <span>Interactive AI Tutor</span>
              </span>
              <h2 className="tutor-concept-title">{displayConceptName}</h2>
              <span className="tutor-subject-subtext">{displaySubject}</span>
            </div>

            <div className="tutor-header-actions">
              <button
                className={`tutor-complete-toggle-btn ${isCompleted ? 'is-completed' : ''}`}
                onClick={handleToggleCompletion}
                disabled={isUpdatingProgress}
                title={isCompleted ? 'Mark concept incomplete' : 'Mark concept as completed'}
              >
                {isCompleted ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span>Completed</span>
                  </>
                ) : (
                  <>
                    <Circle size={16} />
                    <span>Mark Completed</span>
                  </>
                )}
              </button>

              <button
                className="tutor-modal-close-btn"
                onClick={onClose}
                aria-label="Close tutor panel"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Learning Objective & Source Grounding Banner */}
        {context?.concept.learning_objective && (
          <div className="tutor-objective-strip">
            <div className="objective-strip-content">
              <Target size={14} className="objective-icon" />
              <div className="objective-text-wrap">
                <span className="objective-tag">Objective:</span>
                <span className="objective-description">
                  {context.concept.learning_objective}
                </span>
              </div>
            </div>

            {context?.source_excerpts && context.source_excerpts.length > 0 && (
              <button
                className="tutor-sources-toggle"
                onClick={() => setShowSources(!showSources)}
                aria-expanded={showSources}
              >
                <FileText size={13} />
                <span>{context.source_excerpts.length} Source Grounding(s)</span>
                {showSources ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>
        )}

        {/* Expandable Source Grounding Drawer */}
        {showSources && context?.source_excerpts && (
          <div className="tutor-sources-drawer animate-fade-in">
            <div className="sources-drawer-header">
              <span>Verified Source Excerpts from Uploaded Learning Material</span>
              <span className="sources-count-badge">
                Strict Grounding Active
              </span>
            </div>
            <div className="sources-drawer-list">
              {context.source_excerpts.map((ref, idx) => (
                <div key={idx} className="source-excerpt-item">
                  <div className="source-excerpt-meta">
                    <span>Excerpt #{idx + 1}</span>
                    <span>Chars {ref.start_char} - {ref.end_char}</span>
                  </div>
                  <blockquote className="source-excerpt-quote">
                    "{ref.text}"
                  </blockquote>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversation Area */}
        <main className="tutor-conversation-container">
          {isLoading ? (
            <div className="tutor-loading-state">
              <Loader2 size={32} className="spin-animation text-accent" />
              <p>Initializing concept knowledge & tutor context...</p>
            </div>
          ) : (
            <div className="tutor-messages-list">
              {/* Initial Welcome & Concept Overview Card */}
              <div className="tutor-welcome-card animate-fade-in">
                <div className="welcome-avatar">
                  <Sparkles size={20} />
                </div>
                <div className="welcome-body">
                  <h3 className="welcome-title">
                    Welcome! Let's explore <em>{displayConceptName}</em>.
                  </h3>
                  <p className="welcome-desc">
                    {context?.concept.summary ||
                      'I am your AI study companion grounded strictly in your uploaded course materials. Use the quick controls below or ask any question to begin our interactive lesson.'}
                  </p>

                  {context?.concept.keywords && context.concept.keywords.length > 0 && (
                    <div className="welcome-keywords">
                      <span className="keywords-label">Core Terms:</span>
                      {context.concept.keywords.map((kw, i) => (
                        <span key={i} className="welcome-keyword-pill">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Message History */}
              {messages.map((msg, index) => {
                const isTutor = msg.role === 'assistant';
                return (
                  <div
                    key={msg.id || index}
                    className={`tutor-chat-row ${isTutor ? 'is-tutor-row' : 'is-student-row'}`}
                  >
                    <div className="chat-avatar" aria-hidden="true">
                      {isTutor ? <Bot size={18} /> : <User size={18} />}
                    </div>

                    <div className="chat-bubble-container">
                      <div className="chat-sender-label">
                        {isTutor ? 'AI Tutor' : 'You (Student)'}
                      </div>
                      <div className="chat-bubble-content">
                        {msg.content.split('\n\n').map((paragraph, pIdx) => (
                          <p key={pIdx} className="chat-paragraph">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* In-Flight Thinking Indicator */}
              {isSending && (
                <div className="tutor-chat-row is-tutor-row animate-fade-in">
                  <div className="chat-avatar" aria-hidden="true">
                    <Bot size={18} />
                  </div>
                  <div className="chat-bubble-container">
                    <div className="chat-sender-label">AI Tutor</div>
                    <div className="chat-bubble-content is-thinking">
                      <div className="typing-dots">
                        <span className="dot" />
                        <span className="dot" />
                        <span className="dot" />
                      </div>
                      <span className="thinking-text">
                        Thinking and referencing course materials...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="tutor-error-banner animate-fade-in" role="alert">
                  <AlertCircle size={18} className="error-icon" />
                  <div className="error-content">
                    <div className="error-title">Generation Error</div>
                    <div className="error-text">{errorMessage}</div>
                  </div>
                  {lastFailedMessage && (
                    <button
                      className="error-retry-btn"
                      onClick={() => handleSendMessage(lastFailedMessage)}
                    >
                      <RotateCcw size={13} />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Footer: Quick Learning Actions + Text Input */}
        <footer className="tutor-modal-footer">
          {/* Quick Learning Controls */}
          <div className="tutor-quick-actions" role="toolbar" aria-label="Learning controls">
            <button
              className="quick-action-btn"
              onClick={() =>
                handleSendMessage('Can you explain this concept more simply with plain terms?')
              }
              disabled={isSending || isLoading}
            >
              <Lightbulb size={13} />
              <span>Explain more simply</span>
            </button>

            <button
              className="quick-action-btn"
              onClick={() =>
                handleSendMessage('Can you provide a realistic, practical example of this concept?')
              }
              disabled={isSending || isLoading}
            >
              <AlignLeft size={13} />
              <span>Give an example</span>
            </button>

            <button
              className="quick-action-btn"
              onClick={() =>
                handleSendMessage(
                  'Can you ask me a question to test my understanding of this concept?'
                )
              }
              disabled={isSending || isLoading}
            >
              <HelpCircle size={13} />
              <span>Ask me a question</span>
            </button>

            <button
              className="quick-action-btn"
              onClick={() =>
                handleSendMessage('Could you provide a short recap and summary of this concept?')
              }
              disabled={isSending || isLoading}
            >
              <Sparkles size={13} />
              <span>Summarize this concept</span>
            </button>

            {messages.length > 0 && (
              <button
                className="quick-action-btn btn-reset"
                onClick={handleResetConversation}
                disabled={isSending || isLoading}
                title="Clear conversation history"
              >
                <RotateCcw size={13} />
                <span>Reset Chat</span>
              </button>
            )}
          </div>

          {/* Text Input Area */}
          <div className="tutor-input-box">
            <textarea
              ref={textareaRef}
              className="tutor-textarea"
              placeholder="Ask a question or answer the tutor's check (Enter to send, Shift+Enter for newline)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending || isLoading}
              rows={2}
            />

            <button
              className="tutor-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isSending || isLoading}
              aria-label="Send message"
              title="Send (Enter)"
            >
              {isSending ? (
                <Loader2 size={16} className="spin-animation" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
