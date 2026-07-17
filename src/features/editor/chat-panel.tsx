import * as React from 'react';
import { MousePointerClick, X } from 'lucide-react';
import {
  PromptComposer,
  type ComposerSubmission,
} from '@/components/shared/prompt-composer';
import { ChatMessage } from '@/features/editor/chat-message';
import {
  restoreVersion,
  sendProjectMessage,
  stopGeneration,
} from '@/features/editor/generation';
import { useProjects } from '@/stores/projects';
import type { ElementSelection } from '@/engine/types';

export function ChatPanel({
  projectId,
  selection,
  onClearSelection,
}: {
  projectId: string;
  selection: ElementSelection | null;
  onClearSelection: () => void;
}) {
  const storedMessages = useProjects((s) => s.messages[projectId]);
  const messages = React.useMemo(() => storedMessages ?? [], [storedMessages]);
  const project = useProjects((s) => s.projects.find((p) => p.id === projectId));
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const pinnedToBottom = React.useRef(true);

  const busy = messages.some((m) => m.status === 'streaming');

  // Follow the stream unless the user has scrolled up to read history.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const submit = ({ prompt, attachments }: ComposerSubmission) => {
    pinnedToBottom.current = true;
    sendProjectMessage(projectId, prompt, {
      selection: selection ?? undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    onClearSelection();
  };

  const headVersionId = project?.headVersionId;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        role="log"
        aria-label="Chat with the build agent"
        aria-live="polite"
        className="scrollbar-thin min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5"
      >
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isHeadVersion={
              message.versionId !== undefined &&
              message.versionId === headVersionId
            }
            onRestore={(versionId) => restoreVersion(projectId, versionId)}
          />
        ))}
      </div>

      <div className="shrink-0 px-3 pb-3">
        <PromptComposer
          variant="compact"
          placeholder="Describe a change…"
          busy={busy}
          onStop={() => stopGeneration(projectId)}
          onSubmit={submit}
          contextChips={
            selection ? (
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-brand-violet/30 bg-brand-violet/10 px-2 py-1 text-xs text-foreground">
                <MousePointerClick
                  className="size-3 shrink-0 text-brand-violet"
                  aria-hidden
                />
                <span className="truncate">
                  {'<'}
                  {selection.tag}
                  {'>'} {selection.text || 'selected element'}
                </span>
                <button
                  aria-label="Clear selected element"
                  className="rounded p-0.5 hover:bg-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearSelection();
                  }}
                >
                  <X className="size-3" />
                </button>
              </span>
            ) : undefined
          }
        />
        {busy && (
          <p className="sr-only" role="status">
            The agent is generating changes
          </p>
        )}
      </div>
    </div>
  );
}
