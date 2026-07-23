import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'neon'
  size?: 'sm' | 'md' | 'lg'
}

const variants = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 border border-indigo-500/30',
  neon:
    'bg-emerald-600 text-zinc-950 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 border border-emerald-500/40 font-semibold',
  secondary:
    'border border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/80 hover:border-zinc-600',
  ghost: 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white',
  danger: 'bg-red-600/90 text-white hover:bg-red-500 border border-red-500/30',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-sm font-semibold',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-2 focus:ring-offset-zinc-950',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
