import { createContext, useContext, useState, useCallback, useEffect } from 'react';

type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
};

type ToastContextValue = {
  show: (message: string, type?: Toast['type'], duration?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: Toast['type'] = 'info', duration = 3500) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none px-4 max-w-md w-full">
        {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />)}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration ?? 3500);
    return () => clearTimeout(timer);
  }, [onDismiss, toast.duration]);

  const styles = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-ink-900 text-white',
  };
  const icons = {
    success: <path d="M4 11 L9 16 L20 5" />,
    error: <path d="M12 9 V13 M12 17 H12.01 M10.29 3.86 L1.82 18 A2 2 0 0 0 3.54 21 H20.46 A2 2 0 0 0 22.18 18 L13.71 3.86 A2 2 0 0 0 10.29 3.86 Z" />,
    info: <path d="M12 11 V16 M12 8 H12.01 M12 22 A10 10 0 1 1 12 2 A10 10 0 0 1 12 22 Z" />,
  };

  return (
    <div
      className={`${styles[toast.type]} rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 animate-slide-up pointer-events-auto`}
      role="status"
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {icons[toast.type]}
      </svg>
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="opacity-70 hover:opacity-100 -mr-1" aria-label="Dismiss">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M6 6 L18 18 M6 18 L18 6" />
        </svg>
      </button>
    </div>
  );
}
