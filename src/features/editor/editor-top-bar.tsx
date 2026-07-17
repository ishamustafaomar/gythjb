import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, Globe, Settings2 } from 'lucide-react';
import { LogoMark } from '@/components/shared/logo';
import { UserMenu } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { WithTooltip } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/toast';
import { useProjects, type Project } from '@/stores/projects';
import { cn } from '@/lib/utils';

function EditableProjectName({ project }: { project: Project }) {
  const updateProject = useProjects((s) => s.updateProject);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(project.name);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== project.name) {
      updateProject(project.id, { name: trimmed });
    } else {
      setDraft(project.name);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(project.name);
            setEditing(false);
          }
        }}
        onFocus={(e) => e.target.select()}
        aria-label="Project name"
        className="h-7 w-44 rounded-lg border border-input bg-card px-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring/20"
      />
    );
  }

  return (
    <WithTooltip label="Rename project">
      <button
        className="max-w-44 truncate rounded-lg px-2 py-1 text-sm font-medium transition-colors hover:bg-accent sm:max-w-56"
        onClick={() => {
          setDraft(project.name);
          setEditing(true);
        }}
      >
        {project.name}
      </button>
    </WithTooltip>
  );
}

export function EditorTopBar({
  project,
  onOpenPublish,
  onOpenSettings,
}: {
  project: Project;
  onOpenPublish: () => void;
  onOpenSettings: () => void;
}) {
  const navigate = useNavigate();
  const publishedUrl = project.published?.url;

  const copyUrl = () => {
    const url = publishedUrl ?? `https://${project.slug}.promptly.app`;
    void navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied'),
      () => toast.error('Couldn’t copy the link')
    );
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-card/60 px-2 backdrop-blur sm:px-3">
      <div className="flex min-w-0 items-center gap-1">
        <WithTooltip label="Back to dashboard">
          <button
            aria-label="Back to dashboard"
            className="group flex items-center gap-0.5 rounded-lg p-1 transition-colors hover:bg-accent"
            onClick={() => navigate('/dashboard')}
          >
            <ChevronLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
            <LogoMark className="size-6 rounded-md" />
          </button>
        </WithTooltip>
        <EditableProjectName project={project} />
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <Check className="size-3 text-emerald-500" aria-hidden />
          Saved
        </span>
      </div>

      <div className="hidden min-w-0 flex-1 justify-center md:flex">
        <WithTooltip label={publishedUrl ? 'Copy live link' : 'Copy project link'}>
          <button
            onClick={copyUrl}
            className={cn(
              'flex max-w-72 items-center gap-1.5 truncate rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground shadow-soft transition-colors hover:bg-accent hover:text-foreground'
            )}
          >
            <Globe
              className={cn('size-3 shrink-0', publishedUrl && 'text-emerald-500')}
              aria-hidden
            />
            <span className="truncate">
              {(publishedUrl ?? `https://${project.slug}.promptly.app`).replace(
                'https://',
                ''
              )}
            </span>
          </button>
        </WithTooltip>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <WithTooltip label="Project settings">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Project settings"
            onClick={onOpenSettings}
          >
            <Settings2 />
          </Button>
        </WithTooltip>
        <Button size="sm" onClick={onOpenPublish}>
          <Globe aria-hidden />
          {project.published ? 'Update' : 'Publish'}
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}
