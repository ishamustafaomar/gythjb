import * as React from 'react';
import { clamp } from '@/lib/utils';

export const CHAT_MIN_WIDTH = 320;
export const CHAT_MAX_WIDTH = 560;
export const CHAT_DEFAULT_WIDTH = 400;

/**
 * Vertical drag handle between chat and preview. Supports mouse/touch drag,
 * keyboard arrows, and double-click to reset.
 */
export function ResizeHandle({
  width,
  onWidthChange,
}: {
  width: number;
  onWidthChange: (w: number) => void;
}) {
  const [dragging, setDragging] = React.useState(false);

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;
    const startWidth = width;

    const onMove = (ev: PointerEvent) => {
      onWidthChange(
        clamp(startWidth + (ev.clientX - startX), CHAT_MIN_WIDTH, CHAT_MAX_WIDTH)
      );
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize chat panel"
      aria-valuenow={Math.round(width)}
      aria-valuemin={CHAT_MIN_WIDTH}
      aria-valuemax={CHAT_MAX_WIDTH}
      tabIndex={0}
      className="group relative z-10 -mx-1 w-2 shrink-0 cursor-col-resize touch-none"
      onPointerDown={startDrag}
      onDoubleClick={() => onWidthChange(CHAT_DEFAULT_WIDTH)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onWidthChange(clamp(width - 16, CHAT_MIN_WIDTH, CHAT_MAX_WIDTH));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          onWidthChange(clamp(width + 16, CHAT_MIN_WIDTH, CHAT_MAX_WIDTH));
        }
      }}
    >
      <div
        className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-all ${
          dragging
            ? 'w-[3px] bg-brand-violet'
            : 'group-hover:w-[3px] group-hover:bg-ring/40 group-focus-visible:w-[3px]'
        }`}
      />
    </div>
  );
}
