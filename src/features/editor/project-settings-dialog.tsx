import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { useProjects, type Project } from '@/stores/projects';
import { engine } from '@/engine';

export function ProjectSettingsDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const updateProject = useProjects((s) => s.updateProject);
  const deleteProject = useProjects((s) => s.deleteProject);
  const [name, setName] = React.useState(project.name);
  const [knowledge, setKnowledge] = React.useState(project.knowledge ?? '');
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(project.name);
      setKnowledge(project.knowledge ?? '');
    }
  }, [open, project.name, project.knowledge]);

  const dirty =
    name.trim() !== project.name || knowledge !== (project.knowledge ?? '');

  const save = () => {
    updateProject(project.id, {
      ...(name.trim() && name.trim() !== project.name
        ? { name: name.trim() }
        : {}),
      knowledge,
    });
    toast.success('Project settings saved');
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Project settings</DialogTitle>
            <DialogDescription>
              {engine.templateLabel(project.spec.template)} · created from a
              prompt
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="project-knowledge">Knowledge</Label>
              <p className="mb-1.5 mt-0.5 text-xs text-muted-foreground">
                Notes, preferences, and context you want the agent to keep in
                mind for this project.
              </p>
              <Textarea
                id="project-knowledge"
                autoSize
                maxRows={6}
                rows={3}
                value={knowledge}
                onChange={(e) => setKnowledge(e.target.value)}
                placeholder="e.g. Keep the tone playful. Brand color is teal."
              />
            </div>
            <div className="rounded-xl border border-destructive/30 p-3">
              <p className="text-sm font-medium">Danger zone</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Deleting removes the project, chat, and all versions.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-2.5"
                onClick={() => setConfirmDelete(true)}
              >
                Delete project
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!dirty || !name.trim()}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
                navigate('/dashboard');
              }}
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
