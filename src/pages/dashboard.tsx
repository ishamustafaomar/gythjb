import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpDown, FolderOpen, Plus } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { PromptComposer } from '@/components/shared/prompt-composer';
import { ProjectCard } from '@/components/project/project-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/stores/auth';
import { useProjects } from '@/stores/projects';
import { startProjectFromPrompt } from '@/features/editor/generation';
import { greetingForHour } from '@/lib/utils';

type SortKey = 'recent' | 'name' | 'created';

const SORT_LABELS: Record<SortKey, string> = {
  recent: 'Last edited',
  name: 'Name',
  created: 'Date created',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const projects = useProjects((s) => s.projects);
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState<SortKey>('recent');
  const [creating, setCreating] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? projects.filter((p) => p.name.toLowerCase().includes(q))
      : [...projects];
    switch (sort) {
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'created':
        return list.sort((a, b) => b.createdAt - a.createdAt);
      default:
        return list.sort((a, b) => b.updatedAt - a.updatedAt);
    }
  }, [projects, query, sort]);

  const create = ({ prompt }: { prompt: string }) => {
    setCreating(true);
    const projectId = startProjectFromPrompt(prompt);
    navigate(`/p/${projectId}`);
  };

  const firstName = user?.name.split(' ')[0] ?? 'there';

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <section className="mx-auto max-w-2xl pb-14 pt-14 text-center sm:pt-20">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {greetingForHour(new Date().getHours())}, {firstName}
          </h1>
          <p className="mt-2 text-muted-foreground">
            What do you want to build today?
          </p>
          <PromptComposer
            className="mt-7"
            autoFocus={projects.length === 0}
            disabled={creating}
            onSubmit={create}
            placeholder="Ask Promptly to create a…"
          />
        </section>

        <section aria-label="Your projects">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Your projects
              {projects.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {projects.length}
                </span>
              )}
            </h2>
            {projects.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search
                    className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search projects…"
                    aria-label="Search projects"
                    className="h-8 w-48 pl-8 text-[13px] sm:w-56"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ArrowUpDown aria-hidden />
                      {SORT_LABELS[sort]}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={sort === key}
                        onCheckedChange={() => setSort(key)}
                      >
                        {SORT_LABELS[key]}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          <div className="mt-5">
            {projects.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No projects yet"
                description="Describe what you want to build in the box above — your first app is one sentence away."
                action={
                  <Button
                    variant="outline"
                    onClick={() =>
                      document.querySelector('textarea')?.focus()
                    }
                  >
                    <Plus aria-hidden />
                    Start your first project
                  </Button>
                }
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Search}
                title={`No projects match “${query}”`}
                description="Try a different search, or create something new."
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
