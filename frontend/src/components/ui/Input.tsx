import React from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, rightElement, error, className = '', ...props }, ref) => {
    return (
      <div className={`input-wrapper ${error ? 'input-error' : ''} ${className}`}>
        {leftIcon && <span className="input-left-icon">{leftIcon}</span>}
        <input
          ref={ref}
          className={`input-field ${leftIcon ? 'has-left-icon' : ''} ${
            rightElement ? 'has-right-element' : ''
          }`}
          {...props}
        />
        {rightElement && <div className="input-right-element">{rightElement}</div>}
        {error && <span className="input-error-message">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
