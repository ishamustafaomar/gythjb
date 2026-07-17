import * as React from 'react';
import {
  FileCode2,
  FileText,
  Braces,
  History,
  CircleAlert,
  CircleSlash,
  MousePointerClick,
  ImagePlus,
  Check,
} from 'lucide-react';
import { LogoMark } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { WithTooltip } from '@/components/ui/tooltip';
import type { ChatMessage as ChatMessageModel } from '@/stores/projects';
import type { FileChange } from '@/engine/types';

function StreamingCaret() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-caret-blink rounded-full bg-foreground"
    />
  );
}

function fileIcon(path: string) {
  if (path.endsWith('.css')) return <Braces className="size-3.5" aria-hidden />;
  if (path.endsWith('.md')) return <FileText className="size-3.5" aria-hidden />;
  return <FileCode2 className="size-3.5" aria-hidden />;
}

function ChangeRow({ change }: { change: FileChange }) {
  return (
    <li className="flex items-center gap-2 px-3 py-1.5 text-[13px] animate-fade-up">
      <span className="text-muted-foreground">{fileIcon(change.path)}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-xs">
        {change.path}
      </span>
      <span className="flex items-center gap-1.5 font-mono text-[11px]">
        {change.additions > 0 && (
          <span className="text-emerald-600 dark:text-emerald-400">
            +{change.additions}
          </span>
        )}
        {change.deletions > 0 && (
          <span className="text-red-500">−{change.deletions}</span>
        )}
      </span>
    </li>
  );
}

/** Card summarizing an assistant turn's file edits + resulting version. */
function EditsCard({
  message,
  isHead,
  onRestore,
}: {
  message: ChatMessageModel;
  isHead: boolean;
  onRestore?: (versionId: string) => void;
}) {
  if (!message.changes || message.changes.length === 0) return null;
  const done = message.status === 'complete';

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {done ? (
            <Check className="size-3.5 text-emerald-500" aria-hidden />
          ) : (
            <span
              aria-hidden
              className="size-2 animate-pulse rounded-full bg-brand-violet"
            />
          )}
          {done
            ? `Edited ${message.changes.length} file${message.changes.length === 1 ? '' : 's'}`
            : 'Editing files…'}
        </span>
        {message.versionNumber !== undefined && (
          <span className="flex items-center gap-1.5">
            <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-secondary-foreground">
              v{message.versionNumber}
            </span>
            {!isHead && message.versionId && onRestore && (
              <WithTooltip label="Restore this version">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Restore version ${message.versionNumber}`}
                  onClick={() => onRestore(message.versionId!)}
                >
                  <History />
                </Button>
              </WithTooltip>
            )}
          </span>
        )}
      </div>
      <ul>
        {message.changes.map((change) => (
          <ChangeRow key={change.path} change={change} />
        ))}
      </ul>
    </div>
  );
}

function PlanList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-2.5 space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm animate-fade-up">
          <span
            aria-hidden
            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-violet"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export const ChatMessage = React.memo(function ChatMessage({
  message,
  isHeadVersion,
  onRestore,
}: {
  message: ChatMessageModel;
  isHeadVersion: boolean;
  onRestore?: (versionId: string) => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-3.5 py-2.5 text-sm">
          {(message.selection || message.attachments?.length) && (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {message.selection && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-background/70 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  <MousePointerClick className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">
                    {'<'}
                    {message.selection.tag}
                    {'>'} {message.selection.text}
                  </span>
                </span>
              )}
              {message.attachments?.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 rounded-md bg-background/70 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                >
                  <ImagePlus className="size-3" aria-hidden />
                  <span className="max-w-28 truncate">{name}</span>
                </span>
              ))}
            </div>
          )}
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        </div>
      </div>
    );
  }

  const thinking = message.status === 'streaming' && message.text.length === 0;

  return (
    <div className="flex gap-2.5">
      <LogoMark className="mt-0.5 size-6 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        {thinking ? (
          <p className="shimmer-text w-fit text-sm font-medium">Thinking…</p>
        ) : (
          <>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.text}
              {message.status === 'streaming' && message.outro === undefined && (
                <StreamingCaret />
              )}
            </p>
            {message.planItems && <PlanList items={message.planItems} />}
            <EditsCard
              message={message}
              isHead={isHeadVersion}
              onRestore={onRestore}
            />
            {message.outro !== undefined && message.outro.length > 0 && (
              <p className="mt-2.5 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {message.outro}
                {message.status === 'streaming' && <StreamingCaret />}
              </p>
            )}
            {message.status === 'stopped' && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CircleSlash className="size-3.5" aria-hidden />
                Generation stopped — no changes were applied.
              </p>
            )}
            {message.status === 'error' && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <CircleAlert className="size-3.5" aria-hidden />
                Generation failed.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
});
