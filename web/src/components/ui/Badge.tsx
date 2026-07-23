import clsx from 'clsx'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'info' | 'neon' | 'indigo'
  className?: string
}

const variants = {
  default: 'bg-zinc-800/80 text-zinc-300 border-zinc-700',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  neon: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 glow-neon',
  indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md border px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
