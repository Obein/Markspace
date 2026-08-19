import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass' | 'outline';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primaryColor-600 hover:bg-primaryColor-500 text-white shadow-md shadow-primaryColor-500/20 active:scale-[0.98]',
  secondary:
    'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-200 border border-black/10 dark:border-white/10 active:scale-[0.98]',
  danger:
    'bg-red-600 hover:bg-red-500 text-white shadow-sm shadow-red-500/20 active:scale-[0.98]',
  ghost:
    'bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white',
  glass:
    'bg-primaryColor-500/15 hover:bg-primaryColor-500/25 text-primaryColor-700 dark:text-primaryColor-300 border border-black/10 dark:border-white/15 backdrop-blur-md shadow-xs active:scale-[0.98]',
  outline:
    'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 border border-black/15 dark:border-white/15',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-[11px] rounded-lg gap-1 font-mono',
  sm: 'px-2.5 py-1.5 text-xs rounded-xl gap-1.5',
  md: 'px-3.5 py-2 text-xs rounded-xl gap-2',
  lg: 'px-4 py-2.5 text-sm rounded-xl gap-2 font-medium',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  icon,
  iconRight,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      disabled={disabled || loading}
      className={`${baseClasses} ${variantStyles[variant]} ${sizeStyles[size]} ${widthClass} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          {loadingText ? <span>{loadingText}</span> : children}
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
          {iconRight && <span className="shrink-0">{iconRight}</span>}
        </>
      )}
    </button>
  );
};
