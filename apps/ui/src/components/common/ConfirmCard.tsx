import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmCardProps {
  title?: React.ReactNode;
  message: React.ReactNode;
  notice?: React.ReactNode;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  variant?: 'danger' | 'warning';
  className?: string;
}

export const ConfirmCard: React.FC<ConfirmCardProps> = ({
  title,
  message,
  notice,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  onCancel,
  onConfirm,
  loading = false,
  variant = 'danger',
  className = '',
}) => {
  const isDanger = variant === 'danger';
  const containerClasses = isDanger
    ? 'bg-red-500/10 border-red-500/30'
    : 'bg-amber-500/10 border-amber-500/30';
  const messageColor = isDanger
    ? 'text-red-700 dark:text-red-300'
    : 'text-amber-800 dark:text-amber-300';
  const iconColor = isDanger
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-amber-600 dark:text-amber-400';
  const dividerColor = isDanger ? 'border-red-500/20' : 'border-amber-500/20';

  return (
    <div
      className={`p-3.5 rounded-xl border space-y-2.5 my-1.5 animate-in fade-in zoom-in-95 duration-150 ${containerClasses} ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
        <div className="space-y-1 text-xs flex-1">
          {title && <div className="font-bold text-zinc-900 dark:text-white leading-snug">{title}</div>}
          <div className={`font-medium leading-snug ${messageColor}`}>{message}</div>
          {notice && (
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-mono pt-0.5">
              {notice}
            </div>
          )}
        </div>
      </div>
      <div className={`flex items-center gap-2 justify-end pt-1 border-t ${dividerColor}`}>
        <Button
          type="button"
          size="xs"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          type="button"
          size="xs"
          variant={isDanger ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmText}
        </Button>
      </div>
    </div>
  );
};
