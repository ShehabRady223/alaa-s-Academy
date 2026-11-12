import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: Kind; message: string }
interface Api { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void }
const Ctx = createContext<Api | null>(null);
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Kind, message: string) => {
    const id = ++seq;
    setItems((s) => [...s, { id, kind, message }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 4000);
  }, []);
  const api = useMemo<Api>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }), [push]);
  const Icon = { success: CheckCircle2, error: XCircle, info: Info };
  const color = { success: 'text-green-600', error: 'text-red-600', info: 'text-neutral-500' };
  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto">
        {items.map((t) => {
          const I = Icon[t.kind];
          return (
            <div key={t.id} className="pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800">
              <I className={`mt-0.5 size-4 shrink-0 ${color[t.kind]}`} aria-hidden /><span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be used inside ToastProvider');
  return v;
}
