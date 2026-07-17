/**
 * Inline SVG icon system for generated apps.
 *
 * Every icon is a hand-drawn 24×24 stroke glyph (1.8 stroke, round caps,
 * currentColor) so generated markup stays self-contained — no fonts, no
 * external requests, and icons inherit text color everywhere, including
 * inverted sections.
 */
import type { TopicDomain } from '../types';

export type IconName =
  | 'coffee'
  | 'leaf'
  | 'camera'
  | 'dumbbell'
  | 'plane'
  | 'music'
  | 'sparkles'
  | 'shirt'
  | 'chart'
  | 'code'
  | 'star'
  | 'quote'
  | 'check'
  | 'shield'
  | 'zap'
  | 'truck'
  | 'clock'
  | 'mail'
  | 'phone'
  | 'mapPin'
  | 'arrowRight'
  | 'menu'
  | 'close'
  | 'search'
  | 'cart'
  | 'heart'
  | 'play'
  | 'sun'
  | 'users';

const PATHS: Record<IconName, string> = {
  coffee:
    '<path d="M4 9h12v5.5A4.5 4.5 0 0 1 11.5 19h-3A4.5 4.5 0 0 1 4 14.5z"/><path d="M16 10.5h1.5a2.75 2.75 0 0 1 0 5.5H16"/><path d="M7.5 3.5v2.5M12.5 3.5v2.5"/>',
  leaf: '<path d="M5 19C5 11 11 5 20 4.5 19.5 13.5 13.5 19 5 19z"/><path d="M5 19c3.2-5.4 7.4-9 10.8-10.8"/>',
  camera:
    '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7 10 4.5h4L15.5 7"/><circle cx="12" cy="13.2" r="3.4"/>',
  dumbbell:
    '<path d="M7 8.5v7M4 10v4M17 8.5v7M20 10v4"/><path d="M7 12h10"/>',
  plane: '<path d="M21 3.5 3.5 10.6l6.6 2.5 2.4 6.9z"/><path d="M21 3.5 10.1 13.1"/>',
  music:
    '<path d="M9 18V5.5L19 3.5V16"/><circle cx="6.6" cy="18" r="2.4"/><circle cx="16.6" cy="16" r="2.4"/>',
  sparkles:
    '<path d="m12 4 1.6 4.1L18 9.7l-4.4 1.6L12 15.5l-1.6-4.2L6 9.7l4.4-1.6z"/><path d="m18.3 15.3.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z"/>',
  shirt:
    '<path d="m8.2 4.2 3.8 2 3.8-2L20 8.2l-2.6 2.2-.4-.8V20H7V9.6l-.4.8L4 8.2z"/>',
  chart:
    '<path d="M4 4.5v15h16"/><path d="M8.5 15.5v-4M12.5 15.5v-7M16.5 15.5v-2.5M20 8.5l-4-1"/>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5"/>',
  star: '<path d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>',
  quote:
    '<path d="M5 12h4v3.5A2.5 2.5 0 0 1 6.5 18"/><path d="M5 12a4.5 4.5 0 0 1 4-6"/><path d="M14 12h4v3.5a2.5 2.5 0 0 1-2.5 2.5"/><path d="M14 12a4.5 4.5 0 0 1 4-6"/>',
  check: '<path d="m4.5 12.5 5 5L19.5 7"/>',
  shield:
    '<path d="m12 3 7 2.8v6c0 4.3-2.9 7.4-7 9.2-4.1-1.8-7-4.9-7-9.2v-6z"/><path d="m8.8 12 2.3 2.3 4.1-4.6"/>',
  zap: '<path d="M13 3 5 13.5h6L11 21l8-10.5h-6z"/>',
  truck:
    '<path d="M2.5 7.5H14v8.5H2.5z"/><path d="M14 10.5h3.8l2.7 3v2.5H14"/><circle cx="6.8" cy="18.2" r="1.8"/><circle cx="16.8" cy="18.2" r="1.8"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.6 7.2 8.4 6 8.4-6"/>',
  phone:
    '<path d="M7.2 3.5h2.6L11.3 8l-2 1.6a12.8 12.8 0 0 0 5.1 5.1l1.6-2 4.5 1.5v2.6a2 2 0 0 1-2.2 2A15.6 15.6 0 0 1 5.2 5.7a2 2 0 0 1 2-2.2z"/>',
  mapPin:
    '<path d="M12 21c-4.3-3.8-6.5-7.2-6.5-10.3a6.5 6.5 0 0 1 13 0C18.5 13.8 16.3 17.2 12 21z"/><circle cx="12" cy="10.5" r="2.4"/>',
  arrowRight: '<path d="M4 12h16M13.5 5.5 20 12l-6.5 6.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m15.8 15.8 5.2 5.2"/>',
  cart: '<path d="M3.5 4.5H6l2.4 10.5h9.4l2.2-8H7"/><circle cx="9.4" cy="19.4" r="1.6"/><circle cx="16.6" cy="19.4" r="1.6"/>',
  heart:
    '<path d="M12 20.2C7.4 17.2 4.4 14.2 3.4 11 2.4 8 4.4 4.9 7.5 4.9c1.9 0 3.4 1 4.5 2.7 1.1-1.7 2.6-2.7 4.5-2.7 3.1 0 5.1 3.1 4.1 6.1-1 3.2-4 6.2-8.6 9.2z"/>',
  play: '<path d="M8 5.5 18.5 12 8 18.5z"/>',
  sun: '<circle cx="12" cy="12" r="4.3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7"/>',
  users:
    '<circle cx="9" cy="8.4" r="3.4"/><path d="M3.2 19.8c.6-3.8 3-5.8 5.8-5.8s5.2 2 5.8 5.8"/><path d="M15.6 5.4a3.4 3.4 0 0 1 0 6"/><path d="M17.3 14.4c1.9.9 3.1 2.7 3.5 5.4"/>',
};

export const ICON_NAMES: readonly IconName[] = Object.keys(PATHS) as IconName[];

/**
 * Renders one icon as an inline SVG string. `cls` lands on the svg element
 * so callers can size/color it from CSS.
 */
export function icon(name: IconName, cls?: string): string {
  const classAttr = cls !== undefined && cls.length > 0 ? ` class="${cls}"` : '';
  return `<svg${classAttr} aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PATHS[name]}</svg>`;
}

/** Signature icon for each content domain, used in chips, marks and props. */
export function topicIcon(topic: TopicDomain): IconName {
  switch (topic) {
    case 'food':
      return 'coffee';
    case 'plants':
      return 'leaf';
    case 'tech':
      return 'code';
    case 'fitness':
      return 'dumbbell';
    case 'fashion':
      return 'shirt';
    case 'photography':
      return 'camera';
    case 'travel':
      return 'plane';
    case 'music':
      return 'music';
    case 'wellness':
      return 'sun';
    case 'generic':
      return 'sparkles';
  }
}
