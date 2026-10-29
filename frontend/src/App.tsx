import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { MyLearningPage } from './pages/MyLearningPage';
import { UploadPage } from './pages/UploadPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const { currentPage, navigateTo, selectedSubjectId } = useApp();
  const [subjectContextName, setSubjectContextName] = useState<string>('');

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigateTo('learning');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateTo]);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'learning':
      case 'subjects':
      case 'tree':
      case 'roadmap':
        return <MyLearningPage onSubjectContextUpdate={setSubjectContextName} />;
      case 'upload':
        return <UploadPage />;
      case 'assessments':
        return <AssessmentPage />;
      case 'progress':
        return <PlaceholderPage type="progress" />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  const isLearningView =
    currentPage === 'learning' ||
    currentPage === 'tree' ||
    currentPage === 'roadmap' ||
    currentPage === 'subjects';

  return (
    <AppLayout
      subjectContextName={isLearningView && selectedSubjectId ? subjectContextName : undefined}
      onSearchClick={() => navigateTo('learning')}
    >
      {renderCurrentPage()}
    </AppLayout>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
