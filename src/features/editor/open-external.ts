import { engine } from '@/engine';
import type { VirtualFileSystem } from '@/engine/types';

/**
 * Open a compiled project in a new browser tab, safely.
 *
 * A blob: URL inherits the origin of the page that created it, so opening the
 * compiled app directly (window.open on a blob of its HTML) would run the
 * generated JavaScript at Promptly's own origin — where it could read the
 * accounts and session stored in localStorage. Instead we open a minimal,
 * script-free wrapper page that hosts the app inside a sandboxed iframe with
 * no `allow-same-origin`, giving the app an opaque origin. This mirrors the
 * isolation used by the in-editor preview and community thumbnails.
 */
export function openCompiledInNewTab(files: VirtualFileSystem): void {
  const appHtml = engine.compilePreview(files);
  const srcdoc = escapeForAttribute(appHtml);
  const wrapper = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview · Promptly</title>
    <style>
      html, body { margin: 0; height: 100%; background: #fff; }
      iframe { display: block; width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <iframe sandbox="allow-scripts allow-forms" srcdoc="${srcdoc}"></iframe>
  </body>
</html>`;

  const blob = new Blob([wrapper], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'noopener');
  // Revoke shortly after the tab has had a chance to load the document.
  const revoke = () => URL.revokeObjectURL(url);
  if (win) {
    setTimeout(revoke, 30_000);
  } else {
    revoke();
  }
}

/** Escape a string for safe use inside a double-quoted HTML attribute. */
function escapeForAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
