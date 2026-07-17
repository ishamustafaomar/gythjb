import * as React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/stores/auth';

const NAV_ITEMS = [
  { to: '/community', label: 'Community' },
  { to: '/pricing', label: 'Pricing' },
];

export function MarketingHeader() {
  const user = useAuth((s) => s.user);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Button variant="ghost" size="md" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <button
                aria-label="Open dashboard"
                onClick={() => navigate('/dashboard')}
                className="rounded-full transition-transform hover:scale-105"
              >
                <Avatar name={user.name} />
              </button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="md" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button size="pill" className="h-9" asChild>
                <Link to="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-accent md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="animate-fade-in border-t border-border/60 bg-background px-4 pb-4 pt-2 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-2 py-2.5 text-[15px] font-medium text-foreground hover:bg-accent"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            {user ? (
              <Button size="lg" asChild>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
                  Open dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/login" onClick={() => setMenuOpen(false)}>
                    Log in
                  </Link>
                </Button>
                <Button size="lg" asChild>
                  <Link to="/signup" onClick={() => setMenuOpen(false)}>
                    Get started
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
