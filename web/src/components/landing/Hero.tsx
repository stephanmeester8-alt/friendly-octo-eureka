import { ArrowRight, Lock, Shield, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useTranslation } from '../../store/useLocaleStore'

export function Hero() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const stats = [
    { icon: Lock, label: t.hero.stat1Title, sub: t.hero.stat1Sub },
    { icon: Zap, label: t.hero.stat2Title, sub: t.hero.stat2Sub },
    { icon: Shield, label: t.hero.stat3Title, sub: t.hero.stat3Sub },
  ]

  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950" />
      <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-5xl text-center">
        <Badge variant="info" className="mb-6">{t.hero.badge}</Badge>

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
          {t.hero.title}{' '}
          <span className="gradient-text">{t.hero.titleAccent}</span>
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-400 sm:text-xl">
          {t.hero.subtitle}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" onClick={() => navigate('/signup')}>
            {t.hero.ctaTrial}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/pilot')}>
            {t.hero.ctaPilot}
          </Button>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {stats.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="glass rounded-xl p-4 text-left">
              <Icon className="mb-2 h-5 w-5 text-cyan-400" />
              <p className="font-semibold text-white">{label}</p>
              <p className="text-sm text-slate-400">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
