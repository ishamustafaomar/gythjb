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

export default function SignupPage() {
  const signUp = useAuth((s) => s.signUp);
  const afterAuth = useAfterAuth();
  const [params] = useSearchParams();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string>();
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = signUp(name, email, password);
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
      title="Create your account"
      subtitle="Free to start. Your first app is minutes away."
      footer={
        <p>
          Already have an account?{' '}
          <Link
            to={`/login${nextSuffix}`}
            className="font-medium text-foreground underline underline-offset-2"
          >
            Log in
          </Link>
        </p>
      }
    >
      <SsoButtons />
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            className="mt-1.5"
          />
        </div>
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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="mt-1.5"
          />
          <FieldError message={error} />
        </div>
        <Button type="submit" size="lg" loading={submitting} className="mt-1">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
