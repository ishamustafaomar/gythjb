import * as React from 'react';
import { ArrowUp, ImagePlus, X, Square } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { WithTooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface ComposerSubmission {
  prompt: string;
  attachments: string[];
}

export interface PromptComposerProps {
  variant?: 'hero' | 'compact';
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Shows a stop square instead of the send arrow. */
  busy?: boolean;
  onStop?: () => void;
  onSubmit: (submission: ComposerSubmission) => void;
  /** Extra chips rendered above the textarea (e.g. selected element). */
  contextChips?: React.ReactNode;
  className?: string;
}

/**
 * The product's signature input: a large rounded card with an autosizing
 * textarea, attachment chips, and a circular submit button. Used on the
 * landing hero, the dashboard, and (compact) the editor chat.
 */
export function PromptComposer({
  variant = 'hero',
  placeholder = 'Describe the app or website you want to build…',
  autoFocus,
  disabled,
  busy,
  onStop,
  onSubmit,
  contextChips,
  className,
}: PromptComposerProps) {
  const [value, setValue] = React.useState('');
  const [attachments, setAttachments] = React.useState<string[]>([]);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const canSubmit = value.trim().length > 0 && !disabled && !busy;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({ prompt: value.trim(), attachments });
    setValue('');
    setAttachments([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const names = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((f) => f.name);
    setAttachments((prev) => [...prev, ...names].slice(0, 4));
  };

  return (
    <div
      className={cn(
        'group rounded-3xl border border-border bg-card text-left shadow-card transition-shadow',
        'focus-within:border-ring/30 focus-within:shadow-overlay',
        variant === 'hero' ? 'p-4' : 'p-3',
        className
      )}
      onClick={() => textareaRef.current?.focus()}
    >
      {(contextChips || attachments.length > 0) && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {contextChips}
          {attachments.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2 py-1 text-xs text-muted-foreground"
            >
              <ImagePlus className="size-3" aria-hidden />
              <span className="max-w-32 truncate">{name}</span>
              <button
                aria-label={`Remove attachment ${name}`}
                className="rounded p-0.5 hover:bg-accent hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setAttachments((prev) => prev.filter((n) => n !== name));
                }}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Textarea
        ref={textareaRef}
        autoSize
        maxRows={variant === 'hero' ? 8 : 6}
        autoFocus={autoFocus}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label="Project prompt"
        className={cn(
          'border-0 bg-transparent p-0 shadow-none focus-visible:ring-0',
          variant === 'hero' ? 'min-h-[56px] text-[15px]' : 'min-h-[40px] text-sm'
        )}
      />

      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <WithTooltip label="Attach image">
            <button
              type="button"
              aria-label="Attach image"
              disabled={disabled}
              className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
            >
              <ImagePlus className="size-4" />
            </button>
          </WithTooltip>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {busy ? (
          <WithTooltip label="Stop generating" shortcut="Esc">
            <button
              type="button"
              aria-label="Stop generating"
              className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                onStop?.();
              }}
            >
              <Square className="size-3.5 fill-current" />
            </button>
          </WithTooltip>
        ) : (
          <button
            type="button"
            aria-label="Send prompt"
            disabled={!canSubmit}
            className={cn(
              'flex size-8 items-center justify-center rounded-full transition-all',
              canSubmit
                ? 'bg-primary text-primary-foreground hover:scale-105 active:scale-95'
                : 'bg-muted text-muted-foreground'
            )}
            onClick={(e) => {
              e.stopPropagation();
              submit();
            }}
          >
            <ArrowUp className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function SuggestionChips({
  suggestions,
  onPick,
  className,
}: {
  suggestions: string[];
  onPick: (s: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-2', className)}>
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          className="rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-[13px] text-muted-foreground shadow-soft backdrop-blur transition-all hover:border-ring/30 hover:text-foreground hover:shadow-card"
          onClick={() => onPick(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
