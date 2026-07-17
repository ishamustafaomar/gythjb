import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { Footer } from '@/components/layout/footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/stores/auth';
import { cn } from '@/lib/utils';

type BillingPeriod = 'monthly' | 'yearly';

interface Tier {
  name: string;
  blurb: string;
  monthly: number;
  perSeat?: boolean;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Starter',
    blurb: 'Everything you need to try the idea-to-app loop.',
    monthly: 0,
    features: [
      '5 builds per day',
      '1 published app',
      'Community showcase access',
      'Remix any community project',
    ],
    cta: 'Start free',
  },
  {
    name: 'Pro',
    blurb: 'For builders shipping something real every week.',
    monthly: 24,
    features: [
      'Unlimited builds',
      '10 published apps',
      'Custom publish slugs',
      'Priority generation',
      'Everything in Starter',
    ],
    cta: 'Get Pro',
    highlighted: true,
  },
  {
    name: 'Team',
    blurb: 'One workspace for everyone who builds with you.',
    monthly: 48,
    perSeat: true,
    features: [
      'Everything in Pro',
      'Shared workspaces',
      'Roles & permissions',
      'Centralized billing',
    ],
    cta: 'Start a team',
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is Promptly, exactly?',
    a: 'Promptly turns plain-language descriptions into working apps and websites. You chat, a prototype takes shape in a live preview, and you keep refining it with follow-up messages until it does what you imagined. No boilerplate, no build setup.',
  },
  {
    q: 'Can I export the apps Promptly generates?',
    a: 'Yes. Every project is real code that belongs to you. You can inspect each file as it is written, copy anything out, and keep editing the project inside Promptly for as long as you like — there is no lock-in on any plan.',
  },
  {
    q: 'How does publishing work?',
    a: 'One click turns the current version of your project into a shareable link. Starter accounts get one live app at a time; Pro raises that to ten and lets you pick a custom slug so the address matches your project.',
  },
  {
    q: 'What counts as a build?',
    a: 'A build is one generation pass — your first prompt or any follow-up that changes the project. Starter includes five per day, which resets at midnight. Pro and Team remove the cap entirely.',
  },
  {
    q: 'What is your refund policy?',
    a: 'This is a demo build, so payments are disabled and nothing is ever charged. In a production version of Promptly, paid plans would be refundable in full within 30 days of purchase, no questions asked.',
  },
  {
    q: 'How do team seats work?',
    a: 'Team is billed per seat, and every seat gets full Pro features plus access to your shared workspaces. Add or remove teammates whenever you like — billing adjusts on your next cycle.',
  },
];

function yearlyPerMonth(monthly: number): number {
  return Math.round((monthly * 10) / 12);
}

function TierCard({
  tier,
  yearly,
  onSelectPaid,
}: {
  tier: Tier;
  yearly: boolean;
  onSelectPaid: () => void;
}) {
  const free = tier.monthly === 0;
  const price = free ? 0 : yearly ? yearlyPerMonth(tier.monthly) : tier.monthly;
  const billingNote = free
    ? 'Free forever — no card required'
    : yearly
      ? `Billed $${tier.monthly * 10} per year${tier.perSeat ? ', per seat' : ''}`
      : `Billed monthly${tier.perSeat ? ', per seat' : ''}`;

  const body = (
    <>
      <h3 className="text-lg font-semibold tracking-tight">{tier.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{tier.blurb}</p>
      <p className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-semibold tracking-tight">${price}</span>
        <span className="text-sm text-muted-foreground">
          /month{tier.perSeat ? ' per seat' : ''}
        </span>
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">{billingNote}</p>
      <ul className="mt-6 space-y-2.5">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <Check
              className="mt-0.5 size-4 shrink-0 text-brand-violet"
              aria-hidden
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-8">
        {free ? (
          <Button variant="outline" size="lg" className="w-full" asChild>
            <Link to="/signup">{tier.cta}</Link>
          </Button>
        ) : (
          <Button
            variant={tier.highlighted ? 'primary' : 'outline'}
            size="lg"
            className="w-full"
            onClick={onSelectPaid}
          >
            {tier.cta}
          </Button>
        )}
      </div>
    </>
  );

  if (tier.highlighted) {
    return (
      <div className="relative rounded-2xl bg-brand-gradient p-px shadow-card">
        <Badge
          variant="gradient"
          className="absolute -top-2.5 left-1/2 -translate-x-1/2"
        >
          Most popular
        </Badge>
        <div className="flex h-full flex-col rounded-[15px] bg-card p-6">
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-soft">
      {body}
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const [period, setPeriod] = React.useState<BillingPeriod>('monthly');
  const yearly = period === 'yearly';

  const selectPaid = () => {
    if (user) {
      toast.info('Demo build', 'Payments are disabled in this demo.');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="flex-1">
        <section
          aria-label="Plans"
          className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Pricing that scales with you
            </h1>
            <p className="mt-3 text-muted-foreground">
              Start free and build today. Upgrade when your ideas outgrow the
              limits — never because we made you.
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            <div
              role="group"
              aria-label="Billing period"
              className="inline-flex h-9 items-center gap-0.5 rounded-[10px] bg-muted p-1 text-muted-foreground"
            >
              {(['monthly', 'yearly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={period === p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-all',
                    period === p
                      ? 'bg-card text-foreground shadow-soft'
                      : 'hover:text-foreground'
                  )}
                >
                  {p === 'monthly' ? 'Monthly' : 'Yearly'}
                  {p === 'yearly' && (
                    <Badge variant="success" className="px-1.5">
                      2 months free
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 grid items-stretch gap-6 md:grid-cols-3">
            {TIERS.map((tier) => (
              <TierCard
                key={tier.name}
                tier={tier}
                yearly={yearly}
                onSelectPaid={selectPaid}
              />
            ))}
          </div>
        </section>

        <section
          aria-labelledby="faq-heading"
          className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6"
        >
          <h2
            id="faq-heading"
            className="text-center text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Questions, answered
          </h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-border bg-card shadow-soft"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <ChevronDown
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section aria-label="Get started" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-12 text-center text-white shadow-card">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.25),transparent_60%)]"
            />
            <h2 className="relative text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Build first, decide later
            </h2>
            <p className="relative mx-auto mt-2 max-w-md text-sm text-white/85">
              Every plan starts with the same magic. Describe your idea and see
              it running before you spend a cent.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="relative mt-6 bg-white text-zinc-900 hover:bg-white/90"
              asChild
            >
              <Link to="/signup">
                Start free
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
