import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  size?: ModalSize;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  children?: React.ReactNode;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-6xl w-full',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'lg',
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footer,
  showCloseButton = true,
  closeOnBackdropClick = true,
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // ── Focus Management: Trap focus inside modal, autofocus, & restore on close ──
  useEffect(() => {
    if (!isOpen) return;

    // Remember previously focused element to restore upon closing
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const modalEl = modalRef.current;
    if (modalEl) {
      // Find first interactive element or focus container
      const focusable = modalEl.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        modalEl.focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Tab focus trapping
      if (e.key === 'Tab' && modalEl) {
        const focusable = modalEl.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === modalEl) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previously active element
      if (
        previousActiveElementRef.current &&
        typeof previousActiveElementRef.current.focus === 'function'
      ) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 dark:bg-black/80 backdrop-blur-lg cursor-pointer"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`w-full ${sizeClasses[size]} p-6 sm:p-8 glass-panel rounded-glass-lg border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto cursor-default flex flex-col focus:outline-none ${className}`}
      >
        {/* Close Button */}
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Modal Header */}
        {(title || icon) && (
          <div
            className={`pb-3 border-b border-black/10 dark:border-white/10 mb-5 shrink-0 ${
              icon ? 'flex items-center gap-3' : 'text-center'
            } ${headerClassName}`}
          >
            {icon && (
              <div className="p-2.5 rounded-2xl bg-primaryColor-500/10 border border-primaryColor-500/20 text-primaryColor-600 dark:text-primaryColor-400 shrink-0">
                {icon}
              </div>
            )}
            <div className={icon ? 'text-left min-w-0 flex-1' : ''}>
              {title && (
                <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-wide truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>

        {/* Modal Footer */}
        {footer && (
          <div className="pt-4 mt-4 border-t border-black/10 dark:border-white/10 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
