import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageSquareText,
  Eye,
  Rocket,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { Footer } from '@/components/layout/footer';
import {
  PromptComposer,
  SuggestionChips,
} from '@/components/shared/prompt-composer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/stores/auth';
import { setPendingPrompt } from '@/lib/pending-prompt';
import { startProjectFromPrompt } from '@/features/editor/generation';
import { SHOWCASE_PROJECTS } from '@/lib/showcase';
import { ShowcaseCard } from '@/components/shared/showcase-card';

const SUGGESTIONS = [
  'Habit tracker with streaks',
  'Landing page for a coffee shop',
  'Personal portfolio',
  'Kanban board for my team',
  'Recipe collection site',
];

const STEPS = [
  {
    icon: MessageSquareText,
    title: 'Describe it',
    text: 'Tell the agent what you want to build in plain language — an app, a site, a tool. No specs required.',
  },
  {
    icon: Eye,
    title: 'Watch it build',
    text: 'A working prototype takes shape in front of you, file by file, with a live preview you can click around.',
  },
  {
    icon: Rocket,
    title: 'Iterate & ship',
    text: 'Refine anything with a follow-up message, then publish to a shareable link in one click.',
  },
];

const STATS = [
  { value: '30 sec', label: 'from prompt to preview' },
  { value: '12', label: 'app archetypes understood' },
  { value: '1 click', label: 'to publish and share' },
  { value: '100%', label: 'yours to keep editing' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const [creating, setCreating] = React.useState(false);
  const composerRef = React.useRef<HTMLDivElement | null>(null);

  const handleSubmit = ({ prompt }: { prompt: string }) => {
    if (!user) {
      setPendingPrompt(prompt);
      navigate('/signup?next=continue');
      return;
    }
    setCreating(true);
    const projectId = startProjectFromPrompt(prompt);
    navigate(`/p/${projectId}`);
  };

  const pickSuggestion = (s: string) => {
    const textarea = composerRef.current?.querySelector('textarea');
    if (textarea) {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      setter?.call(textarea, s);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.focus();
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute left-1/2 top-[-180px] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand-orchid/15 blur-3xl" />
            <div className="absolute left-[12%] top-[60px] h-[280px] w-[280px] rounded-full bg-brand-coral/10 blur-3xl" />
            <div className="absolute right-[10%] top-[100px] h-[300px] w-[300px] rounded-full bg-brand-violet/10 blur-3xl" />
          </div>

          <div className="mx-auto max-w-3xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
            <p className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1 text-[13px] font-medium text-muted-foreground shadow-soft backdrop-blur">
              <Sparkles className="size-3.5 text-brand-violet" aria-hidden />
              Your AI build partner
            </p>
            <h1 className="text-balance text-[clamp(2.5rem,7vw,4.5rem)] font-semibold leading-[1.05] tracking-tight">
              Build something{' '}
              <span className="text-gradient">brilliant</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-lg text-muted-foreground">
              Turn ideas into apps and websites by chatting with AI. Describe
              it, watch it build, ship it.
            </p>

            <div ref={composerRef} className="mx-auto mt-9 max-w-2xl">
              <PromptComposer
                autoFocus
                disabled={creating}
                onSubmit={handleSubmit}
                placeholder="Ask Promptly to create a…"
              />
            </div>
            <SuggestionChips
              className="mt-5"
              suggestions={SUGGESTIONS}
              onPick={pickSuggestion}
            />
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              From idea to app in three steps
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
              No boilerplate, no setup, no blank-editor dread. Just a
              conversation that ends with something real.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <div
                  key={step.title}
                  className="group relative rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-card"
                >
                  <span className="absolute right-5 top-5 text-4xl font-semibold text-muted/80 transition-colors group-hover:text-gradient">
                    {i + 1}
                  </span>
                  <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-soft">
                    <step.icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Community showcase */}
        <section>
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">
                  From the community
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Real projects people described into existence. Remix any of
                  them as your starting point.
                </p>
              </div>
              <Button variant="outline" className="hidden sm:inline-flex" asChild>
                <Link to="/community">
                  View all
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {SHOWCASE_PROJECTS.slice(0, 8).map((item) => (
                <ShowcaseCard key={item.id} item={item} />
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Button variant="outline" asChild>
                <Link to="/community">
                  View all projects
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-16 text-center text-white shadow-card">
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.25),transparent_60%)]"
              />
              <h2 className="relative text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Ready to build?
              </h2>
              <p className="relative mx-auto mt-3 max-w-md text-white/85">
                Your first project is one sentence away. Start free — no
                credit card, no setup.
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="relative mt-8 bg-white text-zinc-900 hover:bg-white/90"
                asChild
              >
                <Link to={user ? '/dashboard' : '/signup'}>
                  Start building
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
