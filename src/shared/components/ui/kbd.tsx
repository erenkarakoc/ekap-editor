import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@shared/lib/utils';

const kbdVariants = cva('font-mono text-[10px]', {
  variants: {
    variant: {
      outline:
        'bg-muted text-muted-foreground inline-flex h-5 items-center rounded border px-1.5 font-medium',
      ghost: 'text-muted-foreground/60',
    },
  },
  defaultVariants: {
    variant: 'outline',
  },
});

function Kbd({
  className,
  variant,
  ...props
}: React.ComponentProps<'kbd'> & VariantProps<typeof kbdVariants>) {
  return <kbd className={cn(kbdVariants({ variant }), className)} {...props} />;
}

export { Kbd, kbdVariants };
