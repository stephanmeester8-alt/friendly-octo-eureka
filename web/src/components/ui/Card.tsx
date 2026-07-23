import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
}

export function Card({ children, className, glow }: CardProps) {
  return (
    <div
      className={clsx(
        'glass rounded-2xl p-6 transition-all duration-300',
        glow && 'glow-ring',
        className,
      )}
    >
      {children}
    </div>
  )
}
