import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default: 'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500/30 shadow-lg shadow-indigo-600/20',
        neon: 'bg-emerald-600 text-zinc-950 hover:bg-emerald-500 border border-emerald-500/40 font-semibold shadow-lg shadow-emerald-600/15',
        secondary: 'border border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/80',
        ghost: 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white',
        danger: 'bg-red-600/90 text-white hover:bg-red-500 border border-red-500/30',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-7',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
