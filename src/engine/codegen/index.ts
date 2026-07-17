/**
 * generateFiles — dispatches a spec to its template renderer and assembles
 * the four-file virtual file system every Promptly project ships with.
 */
import type { ProjectSpec, TemplateId, VirtualFileSystem } from '../types';
import { TEMPLATE_LABELS, esc, type TemplateOutput } from './shared';
import { renderLanding } from './templates/landing';
import { renderDashboard } from './templates/dashboard';
import { renderTodo } from './templates/todo';
import { renderHabit } from './templates/habit';
import { renderPortfolio } from './templates/portfolio';
import { renderBlog } from './templates/blog';
import { renderStore } from './templates/store';
import { renderKanban } from './templates/kanban';
import { renderNotes } from './templates/notes';
import { renderPricing } from './templates/pricing';
import { renderRecipes } from './templates/recipes';
import { renderChat } from './templates/chat';

const RENDERERS: Record<TemplateId, (spec: ProjectSpec) => TemplateOutput> = {
  landing: renderLanding,
  dashboard: renderDashboard,
  todo: renderTodo,
  habit: renderHabit,
  portfolio: renderPortfolio,
  blog: renderBlog,
  store: renderStore,
  kanban: renderKanban,
  notes: renderNotes,
  pricing: renderPricing,
  recipes: renderRecipes,
  chat: renderChat,
};

function buildIndexHtml(spec: ProjectSpec, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(spec.name)}</title>
  <meta name="description" content="${esc(spec.tagline)}" />
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
${body}
  <script src="js/app.js"></script>
</body>
</html>
`;
}

function buildReadme(spec: ProjectSpec): string {
  const label = TEMPLATE_LABELS[spec.template];
  return `# ${spec.name}

${spec.tagline}

A ${label.toLowerCase()} generated with Promptly. The project is plain
HTML, CSS and vanilla JavaScript — no build step, no dependencies.

## Files

- \`index.html\` — page structure
- \`css/styles.css\` — theme tokens and styling
- \`js/app.js\` — client-side behavior

## Run it

Open \`index.html\` directly in a browser, or serve the folder:

\`\`\`sh
npx serve .
\`\`\`

Everything runs locally; any saved data lives in your browser's
localStorage.
`;
}

export function generateFiles(spec: ProjectSpec): VirtualFileSystem {
  const output = RENDERERS[spec.template](spec);
  return [
    { path: 'index.html', contents: buildIndexHtml(spec, output.body), language: 'html' },
    { path: 'css/styles.css', contents: `${output.css}\n`, language: 'css' },
    { path: 'js/app.js', contents: `${output.js}\n`, language: 'js' },
    { path: 'README.md', contents: buildReadme(spec), language: 'markdown' },
  ];
}
