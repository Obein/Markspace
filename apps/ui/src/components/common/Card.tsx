import React from 'react';

export type CardVariant = 'default' | 'danger' | 'warning' | 'success' | 'dark' | 'glass';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padded?: boolean;
}

const cardVariantStyles: Record<CardVariant, string> = {
  default:
    'bg-black/[0.03] dark:bg-white/5 border-black/10 dark:border-white/10 text-zinc-900 dark:text-zinc-200',
  danger:
    'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300',
  warning:
    'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200',
  success:
    'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  dark:
    'bg-black/5 dark:bg-black/40 border-black/10 dark:border-white/10 text-zinc-900 dark:text-zinc-200',
  glass:
    'bg-white/80 dark:bg-black/40 border-black/10 dark:border-white/10 shadow-xs text-zinc-900 dark:text-zinc-200 backdrop-blur-md',
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padded = true,
  className = '',
  ...props
}) => {
  const paddingClass = padded ? 'p-4 rounded-2xl' : 'rounded-2xl';
  return (
    <div
      className={`border transition-all ${paddingClass} ${cardVariantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
