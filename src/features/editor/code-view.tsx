import * as React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  FileCode2,
  FileText,
  Braces,
  Folder,
} from 'lucide-react';
import type { VirtualFile, VirtualFileSystem } from '@/engine/types';
import { Button } from '@/components/ui/button';
import { WithTooltip } from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/* Prism is loaded on demand so it never weighs down the main bundle. */
type PrismModule = typeof import('prismjs');
let prismPromise: Promise<PrismModule> | null = null;

function loadPrism(): Promise<PrismModule> {
  prismPromise ??= import('prismjs').then(async (mod) => {
    const Prism = (mod as unknown as { default?: PrismModule }).default ?? mod;
    await Promise.all([
      import('prismjs/components/prism-markup'),
      import('prismjs/components/prism-css'),
      import('prismjs/components/prism-javascript'),
      import('prismjs/components/prism-markdown'),
    ]);
    return Prism;
  });
  return prismPromise;
}

const PRISM_LANGUAGE: Record<VirtualFile['language'], string> = {
  html: 'markup',
  css: 'css',
  js: 'javascript',
  markdown: 'markdown',
};

function iconFor(path: string) {
  if (path.endsWith('.css')) return <Braces className="size-3.5 text-sky-500" aria-hidden />;
  if (path.endsWith('.md')) return <FileText className="size-3.5 text-muted-foreground" aria-hidden />;
  if (path.endsWith('.js')) return <FileCode2 className="size-3.5 text-amber-500" aria-hidden />;
  return <FileCode2 className="size-3.5 text-brand-violet" aria-hidden />;
}

interface TreeFolder {
  name: string;
  files: VirtualFile[];
}

/** Group a flat VFS into root files + one level of folders (matches codegen). */
function buildTree(files: VirtualFileSystem): {
  root: VirtualFile[];
  folders: TreeFolder[];
} {
  const root: VirtualFile[] = [];
  const folderMap = new Map<string, VirtualFile[]>();
  for (const file of files) {
    const slash = file.path.indexOf('/');
    if (slash === -1) {
      root.push(file);
    } else {
      const dir = file.path.slice(0, slash);
      const list = folderMap.get(dir) ?? [];
      list.push(file);
      folderMap.set(dir, list);
    }
  }
  return {
    root,
    folders: [...folderMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, folderFiles]) => ({ name, files: folderFiles })),
  };
}

function FileButton({
  file,
  active,
  depth,
  onSelect,
}: {
  file: VirtualFile;
  active: boolean;
  depth: number;
  onSelect: (path: string) => void;
}) {
  return (
    <button
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-[13px] transition-colors',
        depth === 0 ? 'pl-2' : 'pl-7',
        active
          ? 'bg-accent font-medium text-foreground'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
      )}
      onClick={() => onSelect(file.path)}
    >
      {iconFor(file.path)}
      <span className="truncate">{file.path.split('/').pop()}</span>
    </button>
  );
}

export function CodeView({ files }: { files: VirtualFileSystem }) {
  const [activePath, setActivePath] = React.useState(
    () => files[0]?.path ?? ''
  );
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [copied, setCopied] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState<string | null>(null);

  const active =
    files.find((f) => f.path === activePath) ?? files[0] ?? null;

  React.useEffect(() => {
    if (active && !files.some((f) => f.path === activePath)) {
      setActivePath(files[0]?.path ?? '');
    }
  }, [files, activePath, active]);

  React.useEffect(() => {
    let cancelled = false;
    setHighlighted(null);
    if (!active) return;
    void loadPrism().then((Prism) => {
      if (cancelled) return;
      const grammar = Prism.languages[PRISM_LANGUAGE[active.language]];
      setHighlighted(
        grammar
          ? Prism.highlight(active.contents, grammar, PRISM_LANGUAGE[active.language])
          : null
      );
    });
    return () => {
      cancelled = true;
    };
  }, [active]);

  const copy = () => {
    if (!active) return;
    void navigator.clipboard.writeText(active.contents).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const { root, folders } = React.useMemo(() => buildTree(files), [files]);
  const lines = active ? active.contents.split('\n') : [];

  return (
    <div className="flex min-h-0 flex-1 bg-card">
      <nav
        aria-label="Project files"
        className="scrollbar-thin w-48 shrink-0 overflow-y-auto border-r border-border p-2"
      >
        {root.map((file) => (
          <FileButton
            key={file.path}
            file={file}
            depth={0}
            active={file.path === active?.path}
            onSelect={setActivePath}
          />
        ))}
        {folders.map((folder) => (
          <React.Fragment key={folder.name}>
            <button
              className="flex w-full items-center gap-1.5 rounded-lg py-1.5 pl-2 pr-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
              aria-expanded={!collapsed[folder.name]}
              onClick={() =>
                setCollapsed((c) => ({ ...c, [folder.name]: !c[folder.name] }))
              }
            >
              {collapsed[folder.name] ? (
                <ChevronRight className="size-3.5" aria-hidden />
              ) : (
                <ChevronDown className="size-3.5" aria-hidden />
              )}
              <Folder className="size-3.5 text-muted-foreground" aria-hidden />
              <span className="truncate">{folder.name}</span>
            </button>
            {!collapsed[folder.name] &&
              folder.files.map((file) => (
                <FileButton
                  key={file.path}
                  file={file}
                  depth={1}
                  active={file.path === active?.path}
                  onSelect={setActivePath}
                />
              ))}
          </React.Fragment>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
          <span className="truncate font-mono text-xs text-muted-foreground">
            {active?.path}
          </span>
          <WithTooltip label={copied ? 'Copied' : 'Copy file'}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Copy file contents"
              onClick={copy}
            >
              {copied ? <Check className="text-emerald-500" /> : <Copy />}
            </Button>
          </WithTooltip>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
          {active === null ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <table className="w-full border-collapse font-mono text-xs leading-relaxed">
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i}>
                    <td
                      aria-hidden
                      className="w-10 select-none pr-3 text-right align-top text-muted-foreground/50"
                    >
                      {i + 1}
                    </td>
                    <td className="whitespace-pre pr-4 align-top">
                      {highlighted === null ? (
                        line || ' '
                      ) : (
                        <span
                          // Prism output for engine-generated source only.
                          dangerouslySetInnerHTML={{
                            __html:
                              highlighted.split('\n')[i] || '&nbsp;',
                          }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
