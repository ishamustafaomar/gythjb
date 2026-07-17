import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-shimmer rounded-lg bg-[linear-gradient(90deg,hsl(var(--muted))_25%,hsl(var(--accent))_50%,hsl(var(--muted))_75%)] bg-[length:200%_100%]',
        className
      )}
      {...props}
    />
  );
}
