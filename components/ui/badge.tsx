import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap [&>svg]:size-3 [&>svg]:pointer-events-none transition-colors',
  {
    variants: {
      variant: {
        default: 'border-white/10 bg-white/5 text-zinc-300',
        emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
        cyan: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300',
        amber: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
        danger: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
