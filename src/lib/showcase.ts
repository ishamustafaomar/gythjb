/**
 * Curated community-showcase entries. Each is defined only by a prompt —
 * the engine deterministically generates the full project from it (seeded
 * by the entry id), so thumbnails are real rendered apps and "Remix"
 * genuinely recreates the project for the current user.
 */
export interface ShowcaseItem {
  id: string;
  title: string;
  author: string;
  remixes: number;
  category: 'Website' | 'Personal' | 'Internal tools' | 'Consumer app';
  prompt: string;
}

export const SHOWCASE_PROJECTS: ShowcaseItem[] = [
  {
    id: 'showcase-ember',
    title: 'Ember Coffee Roasters',
    author: 'mira',
    remixes: 412,
    category: 'Website',
    prompt:
      'A warm landing page for a specialty coffee roastery called "Ember", with an amber palette, testimonials and a FAQ',
  },
  {
    id: 'showcase-orbit',
    title: 'Orbit Analytics',
    author: 'devon',
    remixes: 368,
    category: 'Internal tools',
    prompt: 'A dark analytics dashboard called "Orbit" with indigo accents',
  },
  {
    id: 'showcase-daily',
    title: 'Daily Loop',
    author: 'sasha',
    remixes: 297,
    category: 'Consumer app',
    prompt: 'A habit tracker called "Daily Loop" with an emerald green theme',
  },
  {
    id: 'showcase-atelier',
    title: 'Atelier Noir',
    author: 'jules',
    remixes: 251,
    category: 'Personal',
    prompt:
      'An elegant serif portfolio for a photographer called "Atelier Noir", dark mode with a gallery and contact form',
  },
  {
    id: 'showcase-crumb',
    title: 'Crumb & Crust',
    author: 'theo',
    remixes: 233,
    category: 'Website',
    prompt:
      'A recipe collection site for a bakery called "Crumb & Crust" with a rose palette',
  },
  {
    id: 'showcase-flowboard',
    title: 'Flowboard',
    author: 'ana',
    remixes: 214,
    category: 'Internal tools',
    prompt: 'A kanban board called "Flowboard" for a product team, blue theme',
  },
  {
    id: 'showcase-fieldnotes',
    title: 'Fieldnotes',
    author: 'kai',
    remixes: 189,
    category: 'Personal',
    prompt: 'A minimal notes app called "Fieldnotes" with a slate monochrome look',
  },
  {
    id: 'showcase-verdant',
    title: 'Verdant Supply',
    author: 'noor',
    remixes: 176,
    category: 'Website',
    prompt:
      'An online store called "Verdant Supply" selling house plants, green theme with a pill-shaped soft feel',
  },
  {
    id: 'showcase-signal',
    title: 'Signal Blog',
    author: 'remy',
    remixes: 158,
    category: 'Personal',
    prompt: 'A tech blog called "Signal" with a purple accent and serif headlines',
  },
  {
    id: 'showcase-northstar',
    title: 'Northstar Pricing',
    author: 'ivy',
    remixes: 141,
    category: 'Website',
    prompt: 'A pricing page for a SaaS called "Northstar" with teal accents and a FAQ',
  },
  {
    id: 'showcase-pulse',
    title: 'Pulse Chat',
    author: 'omar',
    remixes: 127,
    category: 'Consumer app',
    prompt: 'A chat app called "Pulse" with a violet theme, dark mode',
  },
  {
    id: 'showcase-harvest',
    title: 'Harvest Table',
    author: 'lena',
    remixes: 118,
    category: 'Website',
    prompt:
      'A landing page for a farm-to-table restaurant called "Harvest Table" with stats and a newsletter signup',
  },
];
