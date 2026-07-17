import * as React from 'react';
import { create } from 'zustand';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn, uid } from '@/lib/utils';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

interface ToastStore {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => string;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = uid('toast');
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ kind: 'success', title, description }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ kind: 'error', title, description }),
  info: (title: string, description?: string, action?: ToastItem['action']) =>
    useToastStore.getState().push({ kind: 'info', title, description, action }),
};

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />,
  error: <AlertCircle className="size-4 text-destructive" aria-hidden />,
  info: <Info className="size-4 text-muted-foreground" aria-hidden />,
};

const AUTO_DISMISS_MS = 4500;

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);

  React.useEffect(() => {
    const timer = setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [item.id, dismiss]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-80 items-start gap-3 rounded-xl border border-border bg-popover p-3.5 shadow-overlay',
        'animate-fade-up'
      )}
    >
      <span className="mt-0.5">{ICONS[item.kind]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
            {item.description}
          </p>
        )}
        {item.action && (
          <button
            className="mt-1.5 text-[13px] font-medium underline underline-offset-2 hover:text-foreground"
            onClick={() => {
              item.action?.onClick();
              dismiss(item.id);
            }}
          >
            {item.action.label}
          </button>
        )}
      </div>
      <button
        aria-label="Dismiss notification"
        className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        onClick={() => dismiss(item.id)}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>
  );
}
