/**
 * Landing page template — composed entirely from shared section renderers,
 * ordered by spec.sections.
 */
import type { ProjectSpec } from '../../types';
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
  const action = spec.sections.includes('cta')
    ? '<a class="btn btn-primary" href="#cta">Get started</a>'
    : '';

  const body = [
    renderHeader(spec, sectionNavLinks(spec), action),
    '  <main id="main">',
    ...spec.sections.map((section) => renderSection(section, spec)),
    '  </main>',
    renderFooter(spec),
  ].join('\n');

  const css = [cssVariables(spec), baseCss(spec), pageSectionsCss(spec)].join('\n\n');

  return { body, css, js: pageSectionsJs(spec) };
}
