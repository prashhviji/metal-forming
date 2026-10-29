'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  text: string;
}

const ToastContext = createContext<(text: string, tone?: ToastTone) => void>(() => {});

export const useToast = () => useContext(ToastContext);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const STYLES = {
  success: 'border-emerald-500/30 text-emerald-200',
  error: 'border-red-500/30 text-red-200',
  info: 'border-sky-500/30 text-sky-200',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback((text: string, tone: ToastTone = 'success') => {
    const id = ++seq.current;
    setItems((cur) => [...cur.slice(-3), { id, tone, text }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
        {items.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex animate-fade-in items-start gap-2.5 rounded-xl border bg-[#0b1020]/95 px-3.5 py-3 text-sm shadow-xl backdrop-blur',
                STYLES[t.tone]
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{t.text}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
