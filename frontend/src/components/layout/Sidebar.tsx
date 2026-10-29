import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  CheckCircle2,
  Settings,
  X,
  Sparkles,
} from 'lucide-react';
import { useApp, type PageId } from '../../context/AppContext';
import { StatusIndicator } from '../ui/StatusIndicator';
import './Sidebar.css';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC = () => {
  const { currentPage, navigateTo, backendStatus, mobileNavOpen, setMobileNavOpen } = useApp();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={17} />,
    },
    {
      id: 'learning',
      label: 'My Learning',
      icon: <BookOpen size={17} />,
    },
    {
      id: 'assessments',
      label: 'Assessment',
      icon: <CheckCircle2 size={17} />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={17} />,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileNavOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${mobileNavOpen ? 'is-mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={() => navigateTo('dashboard')}>
            <div className="brand-symbol">
              <Sparkles size={18} className="brand-icon" />
            </div>
            <div className="brand-meta">
              <span className="brand-title">Infinite Knowledge</span>
              <span className="brand-subtitle">AI Study System</span>
            </div>
          </div>

          <button
            className="mobile-close-btn"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          <div className="nav-group">
            {navItems.map((item) => {
              const isActive =
                currentPage === item.id ||
                (item.id === 'learning' &&
                  (currentPage === 'learning' ||
                    currentPage === 'subjects' ||
                    currentPage === 'tree' ||
                    currentPage === 'roadmap'));

              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive ? 'is-active' : ''}`}
                  onClick={() => navigateTo(item.id)}
                >
                  <span className="nav-item-icon">{item.icon}</span>
                  <span className="nav-item-label">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer with Live Backend Connection info */}
        <div className="sidebar-footer">
          <div className="backend-status-box">
            <div className="status-header">
              <span className="status-title">FastAPI Backend</span>
              <StatusIndicator
                status={backendStatus}
                label={backendStatus === 'online' ? 'Connected' : backendStatus === 'offline' ? 'Offline' : 'Checking'}
              />
            </div>
            <div className="status-endpoint">http://127.0.0.1:8000</div>
          </div>
        </div>
      </aside>
    </>
  );
};
