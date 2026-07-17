import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '@/components/shared/logo';
import { useAuth } from '@/stores/auth';
import { takePendingPrompt } from '@/lib/pending-prompt';
import { startProjectFromPrompt } from '@/features/editor/generation';

/**
 * Shared chrome + post-auth routing for login/signup.
 * If a prompt was parked before auth, it becomes the user's first project.
 */
export function useAfterAuth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  return React.useCallback(() => {
    const pending = takePendingPrompt();
    if (pending) {
      const projectId = startProjectFromPrompt(pending);
      navigate(`/p/${projectId}`, { replace: true });
      return;
    }
    const next = params.get('next');
    navigate(next && next.startsWith('/') ? next : '/dashboard', {
      replace: true,
    });
  }, [navigate, params]);
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-160px] h-[380px] w-[640px] -translate-x-1/2 rounded-full bg-brand-orchid/12 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[15%] h-[280px] w-[280px] rounded-full bg-brand-coral/10 blur-3xl" />
      </div>
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
    </div>
  );
}

export function SsoButtons() {
  const signInDemo = useAuth((s) => s.signInDemo);
  const afterAuth = useAfterAuth();

  const demo = (provider: 'google' | 'github') => {
    signInDemo(provider);
    afterAuth();
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => demo('google')}
        className="flex h-10 items-center justify-center gap-2.5 rounded-[10px] border border-border bg-card text-sm font-medium shadow-soft transition-colors hover:bg-accent"
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.15 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.6z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.2 0 5.9-1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.1 1.2-3.2 0-5.8-2.1-6.8-5l-.14.01-3.6 2.8-.05.13C3.4 21.3 7.4 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.2 14.4a7 7 0 0 1 0-4.7l-.01-.16-3.7-2.8-.12.06a11.9 11.9 0 0 0 0 10.7l3.8-3z"
          />
          <path
            fill="#EB4335"
            d="M12 4.7c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.6l3.8 3c1-2.9 3.6-4.9 6.8-4.9z"
          />
        </svg>
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => demo('github')}
        className="flex h-10 items-center justify-center gap-2.5 rounded-[10px] border border-border bg-card text-sm font-medium shadow-soft transition-colors hover:bg-accent"
      >
        <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
          <path d="M12 .5A11.5 11.5 0 0 0 .5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.25.8-.55v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C17.3 4.6 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.7.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.65.8.55A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z" />
        </svg>
        Continue with GitHub
      </button>
      <div className="my-3 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          or
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 text-[13px] text-destructive">
      {message}
    </p>
  );
}
