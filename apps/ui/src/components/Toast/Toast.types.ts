export interface ToastMessage {
  id: string;
  type: 'error' | 'success' | 'info';
  message: string;
}

export interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}
