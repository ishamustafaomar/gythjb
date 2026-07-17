import { Check, ChevronDown, Cpu, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MODELS, modelInfo, type ModelPreference } from '@/lib/models';
import { useModel } from '@/stores/model';
import { cn } from '@/lib/utils';

/**
 * Composer control for choosing which model handles generations.
 * "Auto" analyzes each task and routes it to the best-suited model;
 * a manual pick pins every task to that model.
 */
export function ModelPicker({ disabled }: { disabled?: boolean }) {
  const preference = useModel((s) => s.preference);
  const setPreference = useModel((s) => s.setPreference);

  const chipLabel =
    preference === 'auto' ? 'Auto' : modelInfo(preference).short;

  const select = (value: ModelPreference) => (e: Event) => {
    e.preventDefault();
    setPreference(value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`Model: ${preference === 'auto' ? 'Auto (routes each task)' : modelInfo(preference).name}`}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-foreground disabled:opacity-50',
            'data-[state=open]:bg-accent data-[state=open]:text-foreground'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {preference === 'auto' ? (
            <Sparkles className="size-3.5 text-brand-violet" aria-hidden />
          ) : (
            <Cpu className="size-3.5" aria-hidden />
          )}
          {chipLabel}
          <ChevronDown className="size-3 opacity-60" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel>Model</DropdownMenuLabel>
        <DropdownMenuItem onSelect={select('auto')} className="items-start">
          <Sparkles className="mt-0.5 !text-brand-violet" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-medium">Auto</span>
            <span className="text-xs leading-snug text-muted-foreground">
              Analyzes each task and routes it to the best-suited model below.
            </span>
          </span>
          {preference === 'auto' && (
            <Check className="mt-0.5 !text-foreground" aria-hidden />
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {MODELS.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onSelect={select(model.id)}
            className="items-start"
          >
            <Cpu className="mt-0.5" aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium">{model.name}</span>
              <span className="text-xs leading-snug text-muted-foreground">
                {model.strengths}
              </span>
            </span>
            {preference === model.id && (
              <Check className="mt-0.5 !text-foreground" aria-hidden />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-2.5 py-1.5 text-[11px] leading-snug text-muted-foreground">
          Demo build — routing decisions are real, but generation runs on
          Promptly’s local engine.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
