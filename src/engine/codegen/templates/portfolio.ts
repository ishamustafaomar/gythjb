/**
 * Portfolio template — shared sections with gallery-first framing and a
 * quieter header (no sales action, just navigation).
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

export function renderPortfolio(spec: ProjectSpec): TemplateOutput {
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));

  const body = [
    renderHeader(spec, sectionNavLinks(spec)),
    '  <main id="main">',
    ...spec.sections.map((section) => renderSection(section, spec, content)),
    '  </main>',
    renderFooter(spec),
  ].join('\n');

  const css = [cssVariables(spec), baseCss(spec), pageSectionsCss(spec)].join('\n\n');

  return { body, css, js: pageSectionsJs(spec) };
}
