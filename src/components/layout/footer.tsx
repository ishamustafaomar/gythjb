import { Link } from 'react-router-dom';
import { Logo } from '@/components/shared/logo';

const COLUMNS: { heading: string; links: { label: string; to: string }[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Community', to: '/community' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Dashboard', to: '/dashboard' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Get started', to: '/signup' },
      { label: 'Log in', to: '/login' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Turn ideas into apps and websites by chatting with AI. Describe
              it, watch it build, ship it.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="text-[13px] font-semibold text-foreground">
                {col.heading}
              </h3>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-[13px] text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Promptly. A clean-room demo product.</p>
          <p>Built for the joy of building.</p>
        </div>
      </div>
    </footer>
  );
}
