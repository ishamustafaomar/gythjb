import * as React from 'react';
import { Check, Copy, ExternalLink, Globe, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { engine } from '@/engine';
import { useProjects, type Project } from '@/stores/projects';
import { uid, cn } from '@/lib/utils';

type Stage = 'idle' | 'building' | 'uploading' | 'live';

const STAGE_LABELS: { key: Exclude<Stage, 'idle'>; label: string }[] = [
  { key: 'building', label: 'Building production bundle' },
  { key: 'uploading', label: 'Uploading to the edge' },
  { key: 'live', label: 'Going live' },
];

export function PublishDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateProject = useProjects((s) => s.updateProject);
  const getHeadVersion = useProjects((s) => s.getHeadVersion);
  const [stage, setStage] = React.useState<Stage>('idle');
  const [copied, setCopied] = React.useState(false);
  const timers = React.useRef<number[]>([]);

  React.useEffect(() => {
    if (!open) {
      setStage('idle');
      setCopied(false);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    }
  }, [open]);

  const head = getHeadVersion(project.id);
  const isRepublish = Boolean(project.published);

  const publish = () => {
    if (!head) return;
    setStage('building');
    timers.current.push(
      window.setTimeout(() => setStage('uploading'), 900),
      window.setTimeout(() => {
        const url =
          project.published?.url ??
          `https://${project.slug}-${uid().slice(-6)}.promptly.app`;
        updateProject(project.id, {
          published: { url, versionId: head.id, at: Date.now() },
        });
        setStage('live');
      }, 1800)
    );
  };

  const copyUrl = () => {
    if (!project.published) return;
    void navigator.clipboard.writeText(project.published.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const openLive = () => {
    const version = getHeadVersion(project.id);
    if (!version) return;
    const html = engine.compilePreview(version.files);
    const blob = new Blob([html], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank', 'noopener');
  };

  const unpublish = () => {
    updateProject(project.id, { published: undefined });
    toast.success('Project unpublished');
    onOpenChange(false);
  };

  const stageIndex = STAGE_LABELS.findIndex((s) => s.key === stage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" aria-hidden />
            {isRepublish ? 'Update your live app' : 'Publish your app'}
          </DialogTitle>
          <DialogDescription>
            {stage === 'live'
              ? 'Your app is live. Anyone with the link can view it.'
              : isRepublish
                ? `Push version v${head?.n ?? '—'} to your existing link.`
                : 'Get a shareable link for the current version. You can update or unpublish any time.'}
          </DialogDescription>
        </DialogHeader>

        {(stage === 'building' || stage === 'uploading') && (
          <ol className="space-y-2.5" aria-label="Publishing progress">
            {STAGE_LABELS.map((s, i) => {
              const done = i < stageIndex;
              const current = i === stageIndex;
              return (
                <li
                  key={s.key}
                  className={cn(
                    'flex items-center gap-2.5 text-sm',
                    done && 'text-muted-foreground',
                    current && 'font-medium',
                    !done && !current && 'text-muted-foreground/50'
                  )}
                >
                  {done ? (
                    <Check className="size-4 text-emerald-500" aria-hidden />
                  ) : current ? (
                    <Loader2 className="size-4 animate-spin text-brand-violet" aria-hidden />
                  ) : (
                    <span
                      aria-hidden
                      className="ml-1 size-2 rounded-full bg-border"
                    />
                  )}
                  {s.label}
                </li>
              );
            })}
          </ol>
        )}

        {(stage === 'live' || (stage === 'idle' && project.published)) &&
          project.published && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
              <span
                aria-hidden
                className="size-2 shrink-0 animate-pulse rounded-full bg-emerald-500"
              />
              <span className="min-w-0 flex-1 truncate font-mono text-[13px]">
                {project.published.url.replace('https://', '')}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Copy live link"
                onClick={copyUrl}
              >
                {copied ? <Check className="text-emerald-500" /> : <Copy />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Open live app"
                onClick={openLive}
              >
                <ExternalLink />
              </Button>
            </div>
          )}

        <DialogFooter>
          {stage === 'idle' && (
            <>
              {project.published && (
                <Button variant="ghost" onClick={unpublish}>
                  Unpublish
                </Button>
              )}
              <Button onClick={publish} disabled={!head}>
                <Globe aria-hidden />
                {isRepublish ? 'Publish update' : 'Publish'}
              </Button>
            </>
          )}
          {stage === 'live' && (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
