import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/stores/auth';
import {
  AuthLayout,
  SsoButtons,
  FieldError,
  useAfterAuth,
} from '@/pages/auth-shared';

export default function LoginPage() {
  const signIn = useAuth((s) => s.signIn);
  const afterAuth = useAfterAuth();
  const [params] = useSearchParams();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string>();
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = signIn(email, password);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    afterAuth();
  };

  const nextSuffix = params.get('next')
    ? `?next=${encodeURIComponent(params.get('next')!)}`
    : '';

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to keep building."
      footer={
        <p>
          New here?{' '}
          <Link
            to={`/signup${nextSuffix}`}
            className="font-medium text-foreground underline underline-offset-2"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <SsoButtons />
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1.5"
          />
          <FieldError message={error} />
        </div>
        <Button type="submit" size="lg" loading={submitting} className="mt-1">
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}
