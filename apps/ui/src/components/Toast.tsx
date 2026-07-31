import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'error' | 'success' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
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
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isError = toast.type === 'error';
  const isSuccess = toast.type === 'success';

  return (
    <div
      className={`pointer-events-auto backdrop-blur-xl border rounded-xl p-3 shadow-2xl flex items-center justify-between gap-3 text-xs font-mono animate-in slide-in-from-right-5 fade-in duration-200 ${
        isError
          ? 'bg-red-950/90 border-red-500/30 text-red-200 shadow-red-950/50'
          : isSuccess
          ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200 shadow-emerald-950/50'
          : 'bg-zinc-900/90 border-white/10 text-zinc-200'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isError && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
        {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
        {!isError && !isSuccess && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
        <span className="truncate">{toast.message}</span>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
