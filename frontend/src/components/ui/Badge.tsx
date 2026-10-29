import React from 'react';
import './Badge.css';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  return (
    <span className={`badge-pill badge-pill-${variant} badge-pill-${size} ${className}`} {...props}>
      {dot && <span className="badge-pill-dot" />}
      {children}
    </span>
  );
};
