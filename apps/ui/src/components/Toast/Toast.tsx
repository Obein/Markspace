import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastMessage, ToastProps } from './Toast.types';

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-md md:max-w-lg w-full px-4 sm:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    // Keep error messages on screen slightly longer (6s) so users can read full details
    const duration = toast.type === 'error' ? 6000 : 4000;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.type, onDismiss]);

  const isError = toast.type === 'error';
  const isSuccess = toast.type === 'success';

  return (
    <div
      className={`pointer-events-auto backdrop-blur-xl border rounded-xl p-3.5 shadow-2xl flex items-start justify-between gap-3 text-xs font-mono animate-in slide-in-from-right-5 fade-in duration-200 ${
        isError
          ? 'bg-red-950/95 border-red-500/30 text-red-200 shadow-red-950/50'
          : isSuccess
          ? 'bg-emerald-950/95 border-emerald-500/30 text-emerald-200 shadow-emerald-950/50'
          : 'bg-zinc-900/95 border-white/10 text-zinc-200'
      }`}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        {isError && <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
        {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
        {!isError && !isSuccess && <Info className="w-4 h-4 text-primaryColor-400 shrink-0 mt-0.5" />}
        <span className="break-words whitespace-pre-wrap leading-relaxed select-text">{toast.message}</span>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition shrink-0 mt-0.5 cursor-pointer"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
