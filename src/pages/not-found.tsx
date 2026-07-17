import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-180px] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand-orchid/15 blur-3xl" />
        <div className="absolute left-[12%] top-[60px] h-[280px] w-[280px] rounded-full bg-brand-coral/10 blur-3xl" />
        <div className="absolute right-[10%] top-[100px] h-[300px] w-[300px] rounded-full bg-brand-violet/10 blur-3xl" />
      </div>

      <p
        aria-hidden
        className="text-gradient text-[clamp(6rem,22vw,10rem)] font-semibold leading-none tracking-tight"
      >
        404
      </p>
      <h1 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
        This page doesn&rsquo;t exist — but it could.
      </h1>
      <p className="mt-3 max-w-md text-balance text-muted-foreground">
        The address you followed leads nowhere. Head back, or describe the page
        you were hoping for and build it yourself.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" asChild>
          <Link to="/">Go home</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link to="/dashboard">Open dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
