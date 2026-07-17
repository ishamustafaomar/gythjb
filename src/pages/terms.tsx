import { MarketingHeader } from '@/components/layout/marketing-header';
import { Footer } from '@/components/layout/footer';

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: 'What you are agreeing to',
    body: [
      'By using Promptly you accept these terms. Promptly is a demonstration product: a chat-driven app builder that runs entirely in your browser. It is provided for exploration and learning, not as a commercial service, and no payment is ever collected.',
    ],
  },
  {
    heading: 'Your account',
    body: [
      'Accounts exist only on the device where you create them. You are responsible for the device and browser profile that hold your data — anyone with access to them has access to your Promptly account. Use a placeholder password, and treat the account as disposable.',
    ],
  },
  {
    heading: 'Your content',
    body: [
      'Everything you build with Promptly is yours. The prompts you write, the projects the engine generates from them, and anything you publish belong to you, with no license granted back to us — there is no "us" server-side to grant one to.',
      'You are equally responsible for what you build. Do not use Promptly to produce content that is unlawful, deceptive, or that infringes someone else’s rights.',
    ],
  },
  {
    heading: 'Acceptable use',
    body: [
      'Keep it honest: do not present demo output as a production service to people who might rely on it, do not attempt to pass off the Promptly demo as an official product of any company, and do not use published links to mislead others.',
    ],
  },
  {
    heading: 'No warranty',
    body: [
      'Promptly is provided as-is, with no guarantees of availability, accuracy, or fitness for any purpose. Because all data lives in browser storage, it can vanish when site data is cleared, when storage quotas are hit, or when browsers change behavior. Do not keep the only copy of anything important here.',
    ],
  },
  {
    heading: 'Limitation of liability',
    body: [
      'To the fullest extent permitted by law, the makers of this demo are not liable for any loss arising from your use of it — including lost projects, lost time, or anything built on top of generated output. Your sole remedy for dissatisfaction is to stop using the demo and clear your site data.',
    ],
  },
  {
    heading: 'Changes to these terms',
    body: [
      'These terms may be revised as the demo evolves. Material changes will be reflected on this page with an updated date. Continuing to use Promptly after a change means you accept the revised terms.',
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated July 2026
        </p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold tracking-tight">
                {section.heading}
              </h2>
              <div className="mt-2 space-y-3">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 40)}
                    className="text-sm leading-relaxed text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
