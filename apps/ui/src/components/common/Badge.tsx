import React from 'react';

export type BadgeVariant =
  | 'primary'
  | 'emerald'
  | 'amber'
  | 'red'
  | 'purple'
  | 'cyan'
  | 'zinc'
  | 'default';

export type BadgeSize = 'xs' | 'sm';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
}

const badgeVariantStyles: Record<BadgeVariant, string> = {
  primary:
    'bg-primaryColor-500/15 text-primaryColor-700 dark:text-primaryColor-300 border-primaryColor-500/30',
  emerald:
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  amber:
    'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  red:
    'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  purple:
    'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  cyan:
    'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  zinc:
    'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
  default:
    'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border-black/10 dark:border-white/15',
};

const badgeSizeStyles: Record<BadgeSize, string> = {
  xs: 'px-2 py-0.5 text-[9px] font-mono font-semibold rounded',
  sm: 'px-2.5 py-0.5 text-[10px] font-semibold rounded-full',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  icon,
  className = '',
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 border backdrop-blur-md ${badgeVariantStyles[variant]} ${badgeSizeStyles[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
