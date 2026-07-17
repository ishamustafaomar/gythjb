import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-soft hover:bg-primary/90',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        outline:
          'border border-border bg-card text-foreground shadow-soft hover:bg-accent',
        ghost: 'text-foreground hover:bg-accent',
        destructive:
          'bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90',
        gradient:
          'bg-brand-gradient text-white shadow-soft hover:opacity-90 hover:shadow-card',
      },
      size: {
        sm: 'h-8 rounded-lg px-3 text-[13px] [&_svg]:size-3.5',
        md: 'h-9 rounded-[10px] px-4 text-sm [&_svg]:size-4',
        lg: 'h-11 rounded-xl px-5 text-[15px] [&_svg]:size-4',
        icon: 'size-9 rounded-[10px] [&_svg]:size-4',
        'icon-sm': 'size-7 rounded-lg [&_svg]:size-3.5',
        pill: 'h-10 rounded-full px-5 text-sm [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading, children, disabled, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled ?? loading ?? undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
