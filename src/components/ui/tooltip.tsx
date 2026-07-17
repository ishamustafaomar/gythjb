import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    shortcut?: string;
  }
>(({ className, sideOffset = 6, children, shortcut, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 flex items-center gap-1.5 rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-overlay',
        'animate-zoom-in select-none',
        className
      )}
      {...props}
    >
      {children}
      {shortcut && (
        <span className="rounded bg-background/20 px-1 font-mono text-[10px]">
          {shortcut}
        </span>
      )}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = 'TooltipContent';

/** Icon-button helper: wraps children in a labelled tooltip. */
export function WithTooltip({
  label,
  shortcut,
  side,
  children,
}: {
  label: string;
  shortcut?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} shortcut={shortcut}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
