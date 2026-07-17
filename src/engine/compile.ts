/**
 * compilePreview — flattens a virtual file system into one self-contained
 * HTML document: styles.css inlined into <style>, app.js into <script>,
 * plus a small runtime guard and (optionally) the element inspector bridge
 * used by the editor preview.
 */
import type { CompileOptions, VirtualFileSystem } from './types';

const LINK_TAG_RE = /[ \t]*<link\b[^>]*href="css\/styles\.css"[^>]*>/;
const SCRIPT_TAG_RE = /[ \t]*<script\b[^>]*src="js\/app\.js"[^>]*>\s*<\/script>/;

/** Prevents an inlined script from terminating its own <script> tag. */
function sanitizeInlineScript(js: string): string {
  return js.replaceAll('</script', '<\\/script');
}

/** External links open in a new tab so the preview iframe stays put. */
const RUNTIME_GUARD = `<script>
(function () {
  'use strict';
  document.addEventListener('click', function (event) {
    var node = event.target instanceof Element ? event.target : null;
    while (node && node.tagName !== 'A') node = node.parentElement;
    if (!node) return;
    var href = node.getAttribute('href') || '';
    if (/^https?:/i.test(href)) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener');
    }
  }, true);
})();
</script>`;

/**
 * Inspector bridge: disabled by default; the parent toggles it with
 * postMessage({type:'promptly:set-inspector', enabled}) and receives
 * {type:'promptly:element-selected', tag, text} on click.
 */
const INSPECTOR_BRIDGE = `<script>
(function () {
  'use strict';
  var enabled = false;
  var box = null;
  var label = null;

  function ensureOverlay() {
    if (box) return;
    box = document.createElement('div');
    box.style.cssText =
      'position:fixed;z-index:2147483646;pointer-events:none;box-sizing:border-box;' +
      'border:2px solid #7A5AF8;border-radius:2px;display:none;';
    label = document.createElement('span');
    label.style.cssText =
      'position:absolute;top:-1.4rem;left:-2px;background:#7A5AF8;color:#fff;' +
      'font:600 11px/1.6 system-ui,sans-serif;padding:0 6px;border-radius:3px;white-space:nowrap;';
    box.appendChild(label);
    document.body.appendChild(box);
  }

  function hideOverlay() {
    if (box) box.style.display = 'none';
  }

  function showOverlay(el) {
    if (!el || el === document.body || el === document.documentElement) {
      hideOverlay();
      return;
    }
    ensureOverlay();
    var rect = el.getBoundingClientRect();
    box.style.display = 'block';
    box.style.left = rect.left + 'px';
    box.style.top = rect.top + 'px';
    box.style.width = rect.width + 'px';
    box.style.height = rect.height + 'px';
    if (label) label.textContent = el.tagName.toLowerCase();
  }

  window.addEventListener('message', function (event) {
    var data = event && event.data;
    if (data && data.type === 'promptly:set-inspector') {
      enabled = !!data.enabled;
      if (!enabled) hideOverlay();
    }
  });

  document.addEventListener('mouseover', function (event) {
    if (!enabled) return;
    var el = event.target instanceof Element ? event.target : null;
    if (el && box && box.contains(el)) return;
    showOverlay(el);
  }, true);

  document.addEventListener('mouseout', function () {
    if (enabled) hideOverlay();
  }, true);

  document.addEventListener('click', function (event) {
    if (!enabled) return;
    event.preventDefault();
    event.stopPropagation();
    var el = event.target instanceof Element ? event.target : null;
    if (!el) return;
    window.parent.postMessage({
      type: 'promptly:element-selected',
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || '').trim().slice(0, 80)
    }, '*');
  }, true);
})();
</script>`;

export function compilePreview(files: VirtualFileSystem, options?: CompileOptions): string {
  const html =
    files.find((file) => file.path === 'index.html')?.contents ??
    '<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8" /><title>Preview</title></head>\n<body>\n</body>\n</html>\n';
  const css = files.find((file) => file.path === 'css/styles.css')?.contents ?? '';
  const js = files.find((file) => file.path === 'js/app.js')?.contents ?? '';

  let out = html;
  out = out.replace(LINK_TAG_RE, () => `  <style>\n${css.trimEnd()}\n  </style>`);
  out = out.replace(SCRIPT_TAG_RE, () => `  <script>\n${sanitizeInlineScript(js.trimEnd())}\n  </script>`);

  const injected = options?.inspector
    ? `${RUNTIME_GUARD}\n${INSPECTOR_BRIDGE}\n`
    : `${RUNTIME_GUARD}\n`;
  out = out.replace('</body>', () => `${injected}</body>`);

  return out;
}
