import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Monitor, Moon, Sun, Trash2 } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/stores/auth';
import { useProjects } from '@/stores/projects';
import { useTheme, type ThemePreference } from '@/stores/theme';
import { cn } from '@/lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const THEME_CHOICES: {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

function ThemeSwatch({ mode }: { mode: ThemePreference }) {
  if (mode === 'system') {
    return (
      <span
        aria-hidden
        className="flex h-12 w-full overflow-hidden rounded-lg border border-border"
      >
        <span className="flex-1 bg-white p-1.5">
          <span className="block h-1.5 w-7 rounded-full bg-zinc-300" />
          <span className="mt-1 block h-1.5 w-4 rounded-full bg-zinc-200" />
        </span>
        <span className="flex-1 bg-zinc-900 p-1.5">
          <span className="block h-1.5 w-7 rounded-full bg-zinc-600" />
          <span className="mt-1 block h-1.5 w-4 rounded-full bg-zinc-700" />
        </span>
      </span>
    );
  }
  const dark = mode === 'dark';
  return (
    <span
      aria-hidden
      className={cn(
        'block h-12 w-full rounded-lg border border-border p-1.5',
        dark ? 'bg-zinc-900' : 'bg-white'
      )}
    >
      <span
        className={cn(
          'block h-1.5 w-10 rounded-full',
          dark ? 'bg-zinc-600' : 'bg-zinc-300'
        )}
      />
      <span
        className={cn(
          'mt-1 block h-1.5 w-6 rounded-full',
          dark ? 'bg-zinc-700' : 'bg-zinc-200'
        )}
      />
    </span>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const updateProfile = useAuth((s) => s.updateProfile);
  const signOut = useAuth((s) => s.signOut);
  const projects = useProjects((s) => s.projects);
  const { preference, setPreference } = useTheme();

  const [name, setName] = React.useState(user?.name ?? '');
  const [email, setEmail] = React.useState(user?.email ?? '');

  if (!user) return null;

  const trimmedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const nameError =
    trimmedName.length < 2 ? 'Name must be at least 2 characters.' : undefined;
  const emailError = !EMAIL_RE.test(normalizedEmail)
    ? 'Enter a valid email address.'
    : undefined;
  const dirty = trimmedName !== user.name || normalizedEmail !== user.email;
  const canSave = dirty && !nameError && !emailError;

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    updateProfile({ name: trimmedName, email: normalizedEmail });
    toast.success('Profile updated');
  };

  const deleteAllProjects = () => {
    const store = useProjects.getState();
    const ids = store.projects.map((p) => p.id);
    ids.forEach((id) => store.deleteProject(id));
    toast.success(
      'Projects deleted',
      `${ids.length} project${ids.length === 1 ? '' : 's'} removed from this browser.`
    );
  };

  const logOut = () => {
    signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, appearance, and data.
        </p>

        <div className="mt-8 space-y-10">
          {/* Profile */}
          <section aria-labelledby="settings-profile">
            <h2
              id="settings-profile"
              className="text-lg font-semibold tracking-tight"
            >
              Profile
            </h2>
            <form
              onSubmit={saveProfile}
              noValidate
              className="mt-3 rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <div className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="settings-name">Name</Label>
                  <Input
                    id="settings-name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5"
                    aria-invalid={Boolean(nameError)}
                  />
                  {nameError && (
                    <p role="alert" className="mt-2 text-[13px] text-destructive">
                      {nameError}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="settings-email">Email</Label>
                  <Input
                    id="settings-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5"
                    aria-invalid={Boolean(emailError)}
                  />
                  {emailError && (
                    <p role="alert" className="mt-2 text-[13px] text-destructive">
                      {emailError}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button type="submit" disabled={!canSave}>
                  Save changes
                </Button>
              </div>
            </form>
          </section>

          {/* Appearance */}
          <section aria-labelledby="settings-appearance">
            <h2
              id="settings-appearance"
              className="text-lg font-semibold tracking-tight"
            >
              Appearance
            </h2>
            <div className="mt-3 rounded-2xl border border-border bg-card p-6 shadow-soft">
              <p className="text-sm text-muted-foreground">
                Choose how Promptly looks on this device.
              </p>
              <div
                role="group"
                aria-label="Theme"
                className="mt-4 grid grid-cols-3 gap-3"
              >
                {THEME_CHOICES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={preference === option.value}
                    onClick={() => setPreference(option.value)}
                    className={cn(
                      'rounded-xl border border-border bg-background p-2.5 text-left transition-colors hover:bg-accent sm:p-3',
                      preference === option.value && 'ring-2 ring-ring'
                    )}
                  >
                    <ThemeSwatch mode={option.value} />
                    <span className="mt-2.5 flex items-center gap-1.5 text-[13px] font-medium">
                      <option.icon
                        className="size-3.5 text-muted-foreground"
                        aria-hidden
                      />
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Danger zone */}
          <section aria-labelledby="settings-danger">
            <h2
              id="settings-danger"
              className="text-lg font-semibold tracking-tight"
            >
              Danger zone
            </h2>
            <div className="mt-3 rounded-2xl border border-destructive/30 bg-card p-6 shadow-soft">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Delete all projects</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    Permanently removes every project, including chat history
                    and versions.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={projects.length === 0}
                      className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 aria-hidden />
                      Delete all
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle>Delete all projects?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes{' '}
                      {projects.length === 1
                        ? 'your only project'
                        : `all ${projects.length} of your projects`}
                      , including every chat and saved version. There is no
                      undo.
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        destructive
                        onClick={deleteAllProjects}
                      >
                        Delete everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="my-5 border-t border-border" />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Log out</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    Ends this session on this device. Your projects stay in
                    this browser.
                  </p>
                </div>
                <Button variant="outline" className="shrink-0" onClick={logOut}>
                  <LogOut aria-hidden />
                  Log out
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
