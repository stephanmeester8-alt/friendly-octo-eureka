import { Link, useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { Button } from '../ui/Button'
import { LanguageSwitcher } from '../ui/LanguageSwitcher'
import { useAuthStore } from '../../store/useAuthStore'
import { useTranslation } from '../../store/useLocaleStore'

export function Navbar() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const links = [
    { href: '#features', label: t.nav.features },
    { href: '#pipeline-demo', label: t.nav.pipeline },
    { href: '#pricing', label: t.nav.pricing },
    { href: '#security', label: t.nav.security },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-indigo-500/30 bg-indigo-600/20">
            <Shield className="h-4 w-4 text-indigo-400" />
          </div>
          <span className="font-semibold tracking-tight text-white">SovereignAI</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 transition hover:text-zinc-200"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher className="hidden sm:flex" />
          {user ? (
            <Button size="sm" variant="primary" onClick={() => navigate('/dashboard')}>
              {t.nav.openWorkspace}
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                {t.nav.login}
              </Button>
              <Button size="sm" variant="neon" onClick={() => navigate('/signup')}>
                {t.nav.startTrial}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
