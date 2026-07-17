import * as React from 'react';
import type { VirtualFileSystem } from '@/engine/types';
import { engine } from '@/engine';
import { cn } from '@/lib/utils';

/** Design width the miniature is rendered at before being scaled down. */
const RENDER_WIDTH = 1200;

/**
 * A real, non-interactive miniature of a generated app: the compiled
 * document rendered in a sandboxed iframe at desktop width, scaled to fit.
 */
export const PreviewThumbnail = React.memo(function PreviewThumbnail({
  files,
  className,
  ratio = 0.625,
}: {
  files: VirtualFileSystem;
  className?: string;
  /** Height as a fraction of width (default 16:10). */
  ratio?: number;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const html = React.useMemo(() => engine.compilePreview(files), [files]);
  const scale = width > 0 ? width / RENDER_WIDTH : 0;

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={cn(
        'pointer-events-none relative w-full select-none overflow-hidden bg-muted',
        className
      )}
      style={{ aspectRatio: `${1 / ratio}` }}
    >
      {scale > 0 && (
        <iframe
          tabIndex={-1}
          title="Project preview"
          loading="lazy"
          sandbox="allow-scripts"
          srcDoc={html}
          scrolling="no"
          className="absolute left-0 top-0 origin-top-left border-0"
          style={{
            width: RENDER_WIDTH,
            height: RENDER_WIDTH * ratio,
            transform: `scale(${scale})`,
          }}
        />
      )}
    </div>
  );
});
