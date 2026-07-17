import { History, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WithTooltip } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/ui/empty-state';
import { useProjects, type Version } from '@/stores/projects';
import { restoreVersion } from '@/features/editor/generation';
import { relativeTime, cn } from '@/lib/utils';

function VersionRow({
  version,
  isHead,
  projectId,
}: {
  version: Version;
  isHead: boolean;
  projectId: string;
}) {
  return (
    <li
      className={cn(
        'group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
        isHead
          ? 'border-brand-violet/40 bg-brand-violet/5'
          : 'border-transparent hover:bg-accent/60'
      )}
    >
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-semibold',
          isHead
            ? 'bg-brand-violet/15 text-brand-violet'
            : 'bg-secondary text-secondary-foreground'
        )}
      >
        v{version.n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-tight">
          {version.summary}
        </p>
        <p className="text-xs text-muted-foreground">
          {isHead ? 'Current version' : relativeTime(version.ts)}
        </p>
      </div>
      {!isHead && (
        <WithTooltip label={`Restore version ${version.n}`}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Restore version ${version.n}`}
            className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
            onClick={() => restoreVersion(projectId, version.id)}
          >
            <RotateCcw />
          </Button>
        </WithTooltip>
      )}
    </li>
  );
}

export function HistoryPanel({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const versions = useProjects((s) => s.versions[projectId]) ?? [];
  const project = useProjects((s) => s.projects.find((p) => p.id === projectId));
  const ordered = [...versions].reverse();

  return (
    <aside
      aria-label="Version history"
      className="flex w-72 shrink-0 animate-slide-in-right flex-col border-l border-border bg-card"
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border pl-4 pr-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <History className="size-4 text-muted-foreground" aria-hidden />
          History
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close version history"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2">
        {ordered.length === 0 ? (
          <EmptyState
            icon={History}
            title="No versions yet"
            description="Each change the agent makes becomes a restorable version."
            className="border-0 py-12"
          />
        ) : (
          <ul className="space-y-1">
            {ordered.map((version) => (
              <VersionRow
                key={version.id}
                version={version}
                isHead={version.id === project?.headVersionId}
                projectId={projectId}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
