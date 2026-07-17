import { MarketingHeader } from '@/components/layout/marketing-header';
import { Footer } from '@/components/layout/footer';

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: 'The short version',
    body: [
      'Promptly is a local-first demo. Everything you create — your account, your projects, your chat history — lives in your own browser’s localStorage. There is no server behind this app, which means there is nothing for us to collect, sell, or lose.',
    ],
  },
  {
    heading: 'What is stored, and where',
    body: [
      'When you create an account, your name and email are saved to localStorage on the device you are using. Projects, generated files, chat messages, saved versions, and your theme preference are stored the same way.',
      'None of this data ever leaves your browser. Opening Promptly on another device or in another browser starts you with a clean slate, because there is no account system in the cloud to sync with.',
    ],
  },
  {
    heading: 'What we do not collect',
    body: [
      'No analytics, no tracking pixels, no fingerprinting, no advertising identifiers, and no third-party scripts watching what you build. Promptly makes no network requests with your personal data, because it has nowhere to send it.',
    ],
  },
  {
    heading: 'A note on passwords',
    body: [
      'The password you choose is lightly obfuscated before being stored locally, but this is a convenience — not security. Because everything sits in localStorage, anyone with access to your browser profile could read it. Please use a throwaway password here, never one you use anywhere real.',
    ],
  },
  {
    heading: 'Your controls',
    body: [
      'You can delete all of your projects at any time from Settings, and logging out ends your session immediately. Clearing your browser’s site data for Promptly erases everything — account included — permanently and instantly.',
    ],
  },
  {
    heading: 'Third parties',
    body: [
      'There are none. The community showcase you see is generated locally by the same engine that builds your projects; no external service is involved in rendering, publishing, or previewing anything.',
    ],
  },
  {
    heading: 'Changes to this policy',
    body: [
      'If Promptly ever gains features that change how data is handled, this page will be updated first and the date above revised. Until then: your data is yours, on your machine, full stop.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Privacy Policy
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
