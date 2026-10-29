import React from 'react';

export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'loading';
  label?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  className = '',
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'var(--success-badge)';
      case 'offline':
        return 'var(--danger-badge)';
      case 'loading':
        return 'var(--warning-badge)';
    }
  };

  return (
    <div
      className={`status-indicator ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          boxShadow: status === 'online' ? '0 0 0 2px var(--success-border)' : 'none',
          animation: status === 'loading' ? 'pulseSubtle 1.2s infinite' : 'none',
          flexShrink: 0,
        }}
      />
      {label && <span>{label}</span>}
    </div>
  );
};
