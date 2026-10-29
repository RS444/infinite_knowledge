import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import './AppLayout.css';

interface AppLayoutProps {
  children: React.ReactNode;
  subjectContextName?: string;
  onSearchClick?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  subjectContextName,
  onSearchClick,
}) => {
  const { toasts, dismissToast } = useApp();

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <Header
          subjectContextName={subjectContextName}
          onSearchClick={onSearchClick}
        />

        <main className="app-content-area">
          {children}
        </main>
      </div>

      {/* Toast Notification Container */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card toast-${toast.type} animate-fade-in`}>
            <div className="toast-icon">
              {toast.type === 'success' && <CheckCircle2 size={16} />}
              {toast.type === 'error' && <AlertCircle size={16} />}
              {toast.type === 'info' && <Info size={16} />}
            </div>
            <div className="toast-body">
              <div className="toast-title">{toast.title}</div>
              {toast.message && <div className="toast-message">{toast.message}</div>}
            </div>
            <button
              className="toast-close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
