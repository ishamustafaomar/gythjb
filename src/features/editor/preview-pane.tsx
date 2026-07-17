import * as React from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  ExternalLink,
  MousePointerClick,
  History,
  Eye,
  Code2,
} from 'lucide-react';
import { engine } from '@/engine';
import type { VirtualFileSystem } from '@/engine/types';
import { Button } from '@/components/ui/button';
import { WithTooltip } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type DeviceSize = 'desktop' | 'tablet' | 'mobile';
export type ViewMode = 'preview' | 'code';

const DEVICE_WIDTHS: Record<DeviceSize, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '390px',
};

const DEVICES: { id: DeviceSize; label: string; icon: typeof Monitor }[] = [
  { id: 'desktop', label: 'Desktop preview', icon: Monitor },
  { id: 'tablet', label: 'Tablet preview', icon: Tablet },
  { id: 'mobile', label: 'Mobile preview', icon: Smartphone },
];

export function PreviewToolbar({
  viewMode,
  onViewModeChange,
  device,
  onDeviceChange,
  inspectorOn,
  onToggleInspector,
  onRefresh,
  onOpenExternal,
  onToggleHistory,
  historyOpen,
}: {
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  device: DeviceSize;
  onDeviceChange: (d: DeviceSize) => void;
  inspectorOn: boolean;
  onToggleInspector: () => void;
  onRefresh: () => void;
  onOpenExternal: () => void;
  onToggleHistory: () => void;
  historyOpen: boolean;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border bg-card/60 px-2">
      <div className="flex items-center gap-1">
        <div
          role="tablist"
          aria-label="Preview or code"
          className="flex items-center rounded-[10px] bg-muted p-0.5"
        >
          <button
            role="tab"
            aria-selected={viewMode === 'preview'}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-all',
              viewMode === 'preview'
                ? 'bg-card text-foreground shadow-soft'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onViewModeChange('preview')}
          >
            <Eye className="size-3.5" aria-hidden />
            Preview
          </button>
          <button
            role="tab"
            aria-selected={viewMode === 'code'}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-all',
              viewMode === 'code'
                ? 'bg-card text-foreground shadow-soft'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onViewModeChange('code')}
          >
            <Code2 className="size-3.5" aria-hidden />
            Code
          </button>
        </div>
        {viewMode === 'preview' && (
          <WithTooltip label={inspectorOn ? 'Exit select mode' : 'Select an element to edit'}>
            <Button
              variant={inspectorOn ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-label="Toggle element selection"
              aria-pressed={inspectorOn}
              className={cn(inspectorOn && 'text-brand-violet')}
              onClick={onToggleInspector}
            >
              <MousePointerClick />
            </Button>
          </WithTooltip>
        )}
      </div>

      {viewMode === 'preview' && (
        <div
          className="hidden items-center gap-0.5 rounded-[10px] bg-muted p-0.5 sm:flex"
          role="group"
          aria-label="Device size"
        >
          {DEVICES.map(({ id, label, icon: Icon }) => (
            <WithTooltip key={id} label={label}>
              <button
                aria-label={label}
                aria-pressed={device === id}
                className={cn(
                  'flex size-7 items-center justify-center rounded-lg transition-all',
                  device === id
                    ? 'bg-card text-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => onDeviceChange(id)}
              >
                <Icon className="size-3.5" />
              </button>
            </WithTooltip>
          ))}
        </div>
      )}

      <div className="flex items-center gap-0.5">
        <WithTooltip label="Refresh preview">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh preview"
            onClick={onRefresh}
          >
            <RotateCw />
          </Button>
        </WithTooltip>
        <WithTooltip label="Open in new tab">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open preview in new tab"
            onClick={onOpenExternal}
          >
            <ExternalLink />
          </Button>
        </WithTooltip>
        <WithTooltip label="Version history">
          <Button
            variant={historyOpen ? 'secondary' : 'ghost'}
            size="icon-sm"
            aria-label="Toggle version history"
            aria-pressed={historyOpen}
            onClick={onToggleHistory}
          >
            <History />
          </Button>
        </WithTooltip>
      </div>
    </div>
  );
}

export function PreviewFrame({
  files,
  device,
  inspectorOn,
  refreshKey,
  onElementSelected,
}: {
  files: VirtualFileSystem | null;
  device: DeviceSize;
  inspectorOn: boolean;
  refreshKey: number;
  onElementSelected: (selection: { tag: string; text: string }) => void;
}) {
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);

  const html = React.useMemo(
    () => (files ? engine.compilePreview(files, { inspector: true }) : null),
    [files]
  );

  // Bridge: inspector toggle down, element selections up.
  React.useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'promptly:set-inspector', enabled: inspectorOn },
      '*'
    );
  }, [inspectorOn, html, refreshKey]);

  React.useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        e.source === iframeRef.current?.contentWindow &&
        e.data?.type === 'promptly:element-selected' &&
        typeof e.data.tag === 'string'
      ) {
        onElementSelected({
          tag: e.data.tag,
          text: typeof e.data.text === 'string' ? e.data.text : '',
        });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onElementSelected]);

  return (
    <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden bg-muted/60 p-0 sm:p-3">
      <div
        className={cn(
          'relative flex min-h-0 w-full overflow-hidden bg-card transition-[max-width] duration-300 ease-panel',
          device !== 'desktop' &&
            'rounded-xl border border-border shadow-card',
          device === 'desktop' && 'sm:rounded-xl sm:border sm:border-border sm:shadow-card'
        )}
        style={{ maxWidth: DEVICE_WIDTHS[device] }}
      >
        {html ? (
          <iframe
            key={refreshKey}
            ref={iframeRef}
            title="App preview"
            sandbox="allow-scripts allow-forms"
            srcDoc={html}
            className="size-full border-0 bg-white"
            onLoad={() =>
              iframeRef.current?.contentWindow?.postMessage(
                { type: 'promptly:set-inspector', enabled: inspectorOn },
                '*'
              )
            }
          />
        ) : (
          <div className="flex size-full flex-col gap-4 p-8" aria-hidden>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <p className="sr-only">Waiting for the first version to build</p>
          </div>
        )}
        {inspectorOn && (
          <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background shadow-overlay">
            Click any element to edit it
          </p>
        )}
      </div>
    </div>
  );
}
