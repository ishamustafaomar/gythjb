/**
 * Pricing page template — shared sections with the plan grid front and
 * center; the header action deep-links straight to the tiers.
 */
import { createRng } from '@/lib/seeded';
import type { ProjectSpec } from '../../types';
import { contentFor } from '../content';
import {
  baseCss,
  cssVariables,
  pageSectionsCss,
  pageSectionsJs,
  renderFooter,
  renderHeader,
  renderSection,
  sectionNavLinks,
  type TemplateOutput,
} from '../shared';

export function renderPricing(spec: ProjectSpec): TemplateOutput {
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const action = spec.sections.includes('pricing')
    ? '<a class="btn btn-primary" href="#pricing">Choose a plan</a>'
    : '';

  const body = [
    renderHeader(spec, sectionNavLinks(spec), action),
    '  <main id="main">',
    ...spec.sections.map((section) => renderSection(section, spec, content)),
    '  </main>',
    renderFooter(spec),
  ].join('\n');

  const css = [cssVariables(spec), baseCss(spec), pageSectionsCss(spec)].join('\n\n');

  return { body, css, js: pageSectionsJs(spec) };
}
