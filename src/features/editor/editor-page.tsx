import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessageSquareText, AppWindow, FolderX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/stores/projects';
import { engine } from '@/engine';
import type { ElementSelection } from '@/engine/types';
import { EditorTopBar } from '@/features/editor/editor-top-bar';
import { ChatPanel } from '@/features/editor/chat-panel';
import {
  PreviewFrame,
  PreviewToolbar,
  type DeviceSize,
  type ViewMode,
} from '@/features/editor/preview-pane';
import { CodeView } from '@/features/editor/code-view';
import { HistoryPanel } from '@/features/editor/history-panel';
import { PublishDialog } from '@/features/editor/publish-dialog';
import { ProjectSettingsDialog } from '@/features/editor/project-settings-dialog';
import {
  ResizeHandle,
  CHAT_DEFAULT_WIDTH,
} from '@/features/editor/resize-handle';
import { isGenerating, stopGeneration } from '@/features/editor/generation';
import { useMediaQuery } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';

function ProjectNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
        <FolderX className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">
        Project not found
      </h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        It may have been deleted, or the link is wrong. Your other projects
        are safe on the dashboard.
      </p>
      <Button className="mt-6" asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}

export default function EditorPage() {
  const { projectId = '' } = useParams();
  const hydrateProject = useProjects((s) => s.hydrateProject);
  const project = useProjects((s) =>
    s.projects.find((p) => p.id === projectId)
  );
  const headVersion = useProjects((s) => {
    const p = s.projects.find((pr) => pr.id === projectId);
    const versions = s.versions[projectId] ?? [];
    return (
      versions.find((v) => v.id === p?.headVersionId) ??
      versions[versions.length - 1]
    );
  });

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [chatWidth, setChatWidth] = React.useState(CHAT_DEFAULT_WIDTH);
  const [mobileTab, setMobileTab] = React.useState<'chat' | 'preview'>('chat');
  const [viewMode, setViewMode] = React.useState<ViewMode>('preview');
  const [device, setDevice] = React.useState<DeviceSize>('desktop');
  const [inspectorOn, setInspectorOn] = React.useState(false);
  const [selection, setSelection] = React.useState<ElementSelection | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  React.useEffect(() => {
    if (projectId) hydrateProject(projectId);
  }, [projectId, hydrateProject]);

  // Esc: stop an active generation (highest priority), else exit inspector.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isGenerating(projectId)) {
        stopGeneration(projectId);
      } else if (inspectorOn) {
        setInspectorOn(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [projectId, inspectorOn]);

  const onElementSelected = React.useCallback(
    (sel: ElementSelection) => {
      setSelection(sel);
      setInspectorOn(false);
      if (!isDesktop) setMobileTab('chat');
    },
    [isDesktop]
  );

  if (!project) return <ProjectNotFound />;

  const files = headVersion?.files ?? null;
  const showChat = isDesktop || mobileTab === 'chat';
  const showWorkbench = isDesktop || mobileTab === 'preview';

  return (
    <div className="flex h-dvh flex-col bg-background">
      <EditorTopBar
        project={project}
        onOpenPublish={() => setPublishOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {!isDesktop && (
        <div
          role="tablist"
          aria-label="Editor panels"
          className="flex shrink-0 gap-1 border-b border-border bg-card/60 p-1.5"
        >
          {(
            [
              { id: 'chat', label: 'Chat', icon: MessageSquareText },
              { id: 'preview', label: 'App', icon: AppWindow },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={mobileTab === id}
              className={cn(
                'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-all',
                mobileTab === id
                  ? 'bg-card text-foreground shadow-soft'
                  : 'text-muted-foreground'
              )}
              onClick={() => setMobileTab(id)}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {showChat && (
          <aside
            aria-label="Chat panel"
            className={cn(
              'flex min-h-0 shrink-0 flex-col',
              isDesktop ? 'border-r-0' : 'w-full'
            )}
            style={isDesktop ? { width: chatWidth } : undefined}
          >
            <ChatPanel
              projectId={projectId}
              selection={selection}
              onClearSelection={() => setSelection(null)}
            />
          </aside>
        )}

        {isDesktop && (
          <ResizeHandle width={chatWidth} onWidthChange={setChatWidth} />
        )}

        {showWorkbench && (
          <main
            aria-label="App workbench"
            className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-border"
          >
            <PreviewToolbar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              device={device}
              onDeviceChange={setDevice}
              inspectorOn={inspectorOn}
              onToggleInspector={() => setInspectorOn((v) => !v)}
              onRefresh={() => setRefreshKey((k) => k + 1)}
              onOpenExternal={() => {
                if (!files) return;
                const html = engine.compilePreview(files);
                const blob = new Blob([html], { type: 'text/html' });
                window.open(URL.createObjectURL(blob), '_blank', 'noopener');
              }}
              onToggleHistory={() => setHistoryOpen((v) => !v)}
              historyOpen={historyOpen}
            />
            <div className="flex min-h-0 flex-1">
              {viewMode === 'preview' ? (
                <PreviewFrame
                  files={files}
                  device={device}
                  inspectorOn={inspectorOn}
                  refreshKey={refreshKey}
                  onElementSelected={onElementSelected}
                />
              ) : files ? (
                <CodeView files={files} />
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  The first version is still being generated…
                </div>
              )}
              {historyOpen && (
                <HistoryPanel
                  projectId={projectId}
                  onClose={() => setHistoryOpen(false)}
                />
              )}
            </div>
          </main>
        )}
      </div>

      <PublishDialog
        project={project}
        open={publishOpen}
        onOpenChange={setPublishOpen}
      />
      <ProjectSettingsDialog
        project={project}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
