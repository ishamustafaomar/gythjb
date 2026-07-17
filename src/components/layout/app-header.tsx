import { Link, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Settings,
  Moon,
  Sun,
  Monitor,
  Compass,
  Search,
} from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Avatar } from '@/components/ui/avatar';
import { Kbd } from '@/components/ui/kbd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/stores/auth';
import { useTheme, type ThemePreference } from '@/stores/theme';
import { isMac } from '@/lib/utils';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function UserMenu() {
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const { preference, setPreference } = useTheme();
  const navigate = useNavigate();

  if (!user) return null;

  const nextTheme: ThemePreference =
    preference === 'light' ? 'dark' : preference === 'dark' ? 'system' : 'light';
  const CurrentThemeIcon =
    THEME_OPTIONS.find((o) => o.value === preference)?.icon ?? Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="rounded-full outline-offset-2 transition-transform hover:scale-105"
        >
          <Avatar name={user.name} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block text-sm font-medium text-foreground">
            {user.name}
          </span>
          <span className="block truncate text-xs font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/settings')}>
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/community')}>
          <Compass />
          Community
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setPreference(nextTheme);
          }}
        >
          <CurrentThemeIcon />
          Theme: {THEME_OPTIONS.find((o) => o.value === preference)?.label}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            signOut();
            navigate('/');
          }}
        >
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo to="/dashboard" />
        <div className="flex items-center gap-3">
          <button
            className="hidden items-center gap-2 rounded-[10px] border border-border bg-card px-3 py-1.5 text-[13px] text-muted-foreground shadow-soft transition-colors hover:bg-accent sm:flex"
            onClick={() =>
              window.dispatchEvent(
                new KeyboardEvent('keydown', {
                  key: 'k',
                  metaKey: isMac,
                  ctrlKey: !isMac,
                })
              )
            }
          >
            <Search className="size-3.5" aria-hidden />
            Search
            <Kbd>{isMac ? '⌘K' : 'Ctrl K'}</Kbd>
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
