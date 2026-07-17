import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-7 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-soft',
        className
      )}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
        <path d="M12 2.5l1.9 4.9a1.2 1.2 0 0 0 .7.7l4.9 1.9a.5.5 0 0 1 0 .9l-4.9 1.9a1.2 1.2 0 0 0-.7.7L12 18.4a.5.5 0 0 1-.9 0l-1.9-4.9a1.2 1.2 0 0 0-.7-.7L3.6 10.9a.5.5 0 0 1 0-.9l4.9-1.9a1.2 1.2 0 0 0 .7-.7L11.1 2.5a.5.5 0 0 1 .9 0z" />
        <path d="M18.5 15.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" opacity=".85" />
      </svg>
    </span>
  );
}

export function Logo({
  to = '/',
  className,
  textClassName,
}: {
  to?: string;
  className?: string;
  textClassName?: string;
}) {
  return (
    <Link
      to={to}
      className={cn('flex items-center gap-2 font-semibold tracking-tight', className)}
      aria-label="Promptly home"
    >
      <LogoMark />
      <span className={cn('text-[17px]', textClassName)}>Promptly</span>
    </Link>
  );
}
