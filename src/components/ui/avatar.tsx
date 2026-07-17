import { cn } from '@/lib/utils';
import { hashSeed } from '@/lib/seeded';

const AVATAR_HUES = [4, 26, 152, 200, 252, 288, 330];

/** Deterministic gradient avatar from a name — no image assets needed. */
export function Avatar({
  name,
  className,
  size = 'md',
}: {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  const hue = AVATAR_HUES[hashSeed(name) % AVATAR_HUES.length]!;
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white',
        size === 'sm' && 'size-6 text-[11px]',
        size === 'md' && 'size-8 text-[13px]',
        size === 'lg' && 'size-10 text-base',
        className
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 80% 60%), hsl(${(hue + 40) % 360} 75% 50%))`,
      }}
    >
      {initial}
    </span>
  );
}
