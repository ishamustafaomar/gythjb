import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  LayoutGrid,
  Compass,
  CreditCard,
  Settings,
  Moon,
  Sun,
  Monitor,
  Plus,
  Search,
  AppWindow,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DialogTitle } from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import { useAuth } from '@/stores/auth';
import { useProjects } from '@/stores/projects';
import { useTheme } from '@/stores/theme';

interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  group: 'Projects' | 'Navigate' | 'Theme';
  run: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const projects = useProjects((s) => s.projects);
  const setPreference = useTheme((s) => s.setPreference);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  const go = React.useCallback(
    (to: string) => {
      setOpen(false);
      navigate(to);
    },
    [navigate]
  );

  const actions = React.useMemo<PaletteAction[]>(() => {
    const projectActions: PaletteAction[] = user
      ? projects.slice(0, 8).map((p) => ({
          id: `open-${p.id}`,
          label: p.name,
          hint: 'Open project',
          icon: <AppWindow className="size-4" />,
          group: 'Projects',
          run: () => go(`/p/${p.id}`),
        }))
      : [];
    const nav: PaletteAction[] = [
      ...(user
        ? [
            {
              id: 'new-project',
              label: 'New project',
              hint: 'Start from a prompt',
              icon: <Plus className="size-4" />,
              group: 'Projects' as const,
              run: () => go('/dashboard'),
            },
          ]
        : []),
      { id: 'home', label: 'Home', icon: <Home className="size-4" />, group: 'Navigate', run: () => go('/') },
      ...(user
        ? [
            {
              id: 'dashboard',
              label: 'Dashboard',
              icon: <LayoutGrid className="size-4" />,
              group: 'Navigate' as const,
              run: () => go('/dashboard'),
            },
          ]
        : []),
      { id: 'community', label: 'Community', icon: <Compass className="size-4" />, group: 'Navigate', run: () => go('/community') },
      { id: 'pricing', label: 'Pricing', icon: <CreditCard className="size-4" />, group: 'Navigate', run: () => go('/pricing') },
      ...(user
        ? [
            {
              id: 'settings',
              label: 'Settings',
              icon: <Settings className="size-4" />,
              group: 'Navigate' as const,
              run: () => go('/settings'),
            },
          ]
        : []),
      { id: 'theme-light', label: 'Theme: Light', icon: <Sun className="size-4" />, group: 'Theme', run: () => { setPreference('light'); setOpen(false); } },
      { id: 'theme-dark', label: 'Theme: Dark', icon: <Moon className="size-4" />, group: 'Theme', run: () => { setPreference('dark'); setOpen(false); } },
      { id: 'theme-system', label: 'Theme: System', icon: <Monitor className="size-4" />, group: 'Theme', run: () => { setPreference('system'); setOpen(false); } },
    ];
    return [...projectActions, ...nav];
  }, [user, projects, go, setPreference]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(q));
  }, [actions, query]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[activeIndex]?.run();
    }
  };

  React.useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  let lastGroup: string | null = null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        hideClose
        className="top-[20%] max-w-lg translate-y-0 overflow-hidden p-0"
        onKeyDown={onKeyDown}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects and actions…"
            aria-label="Search projects and actions"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Kbd>esc</Kbd>
        </div>
        <div
          ref={listRef}
          role="listbox"
          aria-label="Command results"
          className="scrollbar-thin max-h-[320px] overflow-y-auto p-2"
        >
          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results for “{query}”
            </p>
          )}
          {filtered.map((action, index) => {
            const showGroup = action.group !== lastGroup;
            lastGroup = action.group;
            return (
              <React.Fragment key={action.id}>
                {showGroup && (
                  <p className="px-3 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {action.group}
                  </p>
                )}
                <button
                  data-index={index}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    index === activeIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground hover:bg-accent/60'
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => action.run()}
                >
                  <span className="text-muted-foreground">{action.icon}</span>
                  <span className="flex-1 truncate">{action.label}</span>
                  {action.hint && (
                    <span className="text-xs text-muted-foreground">{action.hint}</span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
