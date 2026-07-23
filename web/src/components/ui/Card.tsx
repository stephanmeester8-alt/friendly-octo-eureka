import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  strong?: boolean
}

export function Card({ children, className, glow, strong }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg p-6 transition-all duration-300',
        strong ? 'glass-strong' : 'glass',
        glow && 'glow-ring',
        className,
      )}
    >
      {children}
    </div>
  )
}
