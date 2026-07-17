import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { useProjects, type Project } from '@/stores/projects';
import { PreviewThumbnail } from '@/components/shared/preview-thumbnail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/toast';
import { relativeTime } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const hydrateProject = useProjects((s) => s.hydrateProject);
  const versions = useProjects((s) => s.versions[project.id]);
  const updateProject = useProjects((s) => s.updateProject);
  const duplicateProject = useProjects((s) => s.duplicateProject);
  const deleteProject = useProjects((s) => s.deleteProject);

  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [name, setName] = React.useState(project.name);

  React.useEffect(() => {
    hydrateProject(project.id);
  }, [project.id, hydrateProject]);

  const head =
    versions?.find((v) => v.id === project.headVersionId) ??
    versions?.[versions.length - 1];

  const open = () => navigate(`/p/${project.id}`);

  const submitRename = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== project.name) {
      updateProject(project.id, { name: trimmed });
      toast.success('Project renamed');
    }
    setRenameOpen(false);
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card">
      <button
        className="block w-full cursor-pointer text-left"
        onClick={open}
        aria-label={`Open project ${project.name}`}
      >
        {head ? (
          <PreviewThumbnail files={head.files} />
        ) : (
          <Skeleton className="aspect-[8/5] w-full rounded-none" />
        )}
      </button>
      <div className="flex items-center gap-2 border-t border-border p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight">
            {project.name}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            Edited {relativeTime(project.updatedAt)}
            {project.published && (
              <Badge variant="success" className="px-1.5 py-0">
                <Globe aria-hidden />
                Live
              </Badge>
            )}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Project options for ${project.name}`}
              className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={open}>
              <ExternalLink />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setName(project.name);
                setRenameOpen(true);
              }}
            >
              <Pencil />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                const copy = duplicateProject(project.id);
                if (copy) toast.success('Project duplicated', copy.name);
              }}
            >
              <Copy />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => setDeleteOpen(true)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitRename();
            }}
          >
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Project name"
              onFocus={(e) => e.target.select()}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete “{project.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the project, its chat history, and all of
            its versions. This can’t be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              destructive
              onClick={() => {
                deleteProject(project.id);
                toast.success('Project deleted');
              }}
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
