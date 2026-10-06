import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  body?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div 
      aria-live="polite" 
      className="fixed bottom-10 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
    >
      {toasts.map((toast) => {
        let borderClass = 'border-emerald-200 bg-emerald-50 text-emerald-900';
        let icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;

        if (toast.type === 'error') {
          borderClass = 'border-red-200 bg-red-50 text-red-900';
          icon = <AlertCircle className="w-4 h-4 text-red-600" />;
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-200 bg-amber-50 text-amber-900';
          icon = <AlertTriangle className="w-4 h-4 text-amber-600" />;
        } else if (toast.type === 'info') {
          borderClass = 'border-blue-200 bg-blue-50 text-blue-900';
          icon = <Info className="w-4 h-4 text-blue-600" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-xs transition-all duration-150 animate-in slide-in-from-bottom-2 ${borderClass}`}
          >
            <div className="shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold leading-tight">{toast.title}</div>
              {toast.body && <div className="text-[11px] opacity-80 mt-0.5 leading-snug">{toast.body}</div>}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-gray-400 hover:text-gray-700 p-0.5 rounded shrink-0 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
