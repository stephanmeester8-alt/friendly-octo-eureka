import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
  {
    variants: {
      variant: {
        default: 'border border-zinc-700 bg-zinc-900/60 text-zinc-400',
        live: 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
        active: 'border border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
        locked: 'border border-zinc-700 bg-zinc-900/60 text-zinc-500',
        warning: 'border border-amber-500/40 bg-amber-500/10 text-amber-300',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
