/**
 * Landing page template — composed entirely from shared section renderers,
 * ordered by spec.sections, with copy drawn from the topic content pools.
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

export function renderLanding(spec: ProjectSpec): TemplateOutput {
  const content = contentFor(spec.topic, createRng(`${spec.seed}:content`));
  const action = spec.sections.includes('cta')
    ? '<a class="btn btn-primary" href="#cta">Get started</a>'
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
