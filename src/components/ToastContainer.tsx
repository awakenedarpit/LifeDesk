import React from 'react';
import { useApp } from '../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all ${
            toast.type === 'error'
              ? 'bg-error text-on-error border-error'
              : toast.type === 'info'
              ? 'bg-surface-container-lowest text-on-surface border-outline-variant'
              : 'bg-primary text-on-primary border-primary-container'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`material-symbols-outlined text-[18px] ${
                toast.type === 'info' ? 'text-primary-ink' : ''
              }`}
            >
              {toast.type === 'error' ? 'error' : toast.type === 'info' ? 'info' : 'check_circle'}
            </span>
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => removeToast(toast.id)}
            className="opacity-75 hover:opacity-100 transition-opacity ml-2"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );
};
