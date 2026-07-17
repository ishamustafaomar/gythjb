import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      aria-label="Loading"
      className={cn('size-4 animate-spin text-muted-foreground', className)}
    />
  );
}

/** Full-area centered spinner used as a route Suspense fallback. */
export function PageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="size-6" />
    </div>
  );
}
