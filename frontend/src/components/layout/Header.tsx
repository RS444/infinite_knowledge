import React from 'react';
import { Menu, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import './Header.css';

interface HeaderProps {
  subjectContextName?: string;
  onSearchClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  subjectContextName,
}) => {
  const { currentPage, navigateTo, setMobileNavOpen, setSelectedSubjectId } = useApp();

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Dashboard';
      case 'learning':
      case 'subjects':
      case 'tree':
      case 'roadmap':
        return 'My Learning';
      case 'upload':
        return 'Upload Study Material';
      case 'assessments':
        return 'Assessment';
      case 'progress':
        return 'Progress Analytics';
      case 'settings':
        return 'Settings & API Configuration';
      default:
        return 'Infinite Knowledge';
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumbs Navigation */}
        <nav className="header-breadcrumbs" aria-label="Breadcrumb">
          <button className="breadcrumb-root" onClick={() => navigateTo('dashboard')}>
            Infinite Knowledge
          </button>

          <ChevronRight size={13} className="breadcrumb-separator" />

          <button
            className={`breadcrumb-item ${!subjectContextName ? 'is-active' : ''}`}
            onClick={() => {
              if (currentPage === 'learning' || currentPage === 'tree') {
                setSelectedSubjectId(null);
                navigateTo('learning');
              }
            }}
          >
            {getPageTitle()}
          </button>

          {subjectContextName && (
            <>
              <ChevronRight size={13} className="breadcrumb-separator" />
              <span className="breadcrumb-context">{subjectContextName}</span>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
