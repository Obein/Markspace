import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, iconRight, helperText, className = '', disabled, id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-zinc-400 pointer-events-none shrink-0">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border text-xs font-mono text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed ${
              icon ? 'pl-9' : ''
            } ${iconRight ? 'pr-9' : ''} ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                : 'border-black/15 dark:border-white/10 focus:border-primaryColor-500 focus:ring-1 focus:ring-primaryColor-500/30'
            } ${className}`}
            {...props}
          />
          {iconRight && (
            <div className="absolute right-3 text-zinc-400 shrink-0">{iconRight}</div>
          )}
        </div>
        {error ? (
          <p className="text-[11px] font-mono text-red-600 dark:text-red-400">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
