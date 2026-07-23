import { useState } from 'react'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { PilotModal } from './PilotModal'
import { useTranslation } from '../../store/useLocaleStore'

export function Hero() {
  const { t } = useTranslation()
  const [pilotOpen, setPilotOpen] = useState(false)

  const stats = [
    { label: t.hero.stat1Label, value: t.hero.stat1Value },
    { label: t.hero.stat2Label, value: t.hero.stat2Value },
    { label: t.hero.stat3Label, value: t.hero.stat3Value },
  ]

  return (
    <>
      <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 lg:px-8">
        <div className="terminal-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -right-32 top-0 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />

        <div className="relative mx-auto grid max-w-7xl items-end gap-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Badge variant="indigo" className="mb-8">{t.hero.badge}</Badge>

            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {t.hero.title}
              <br />
              <span className="gradient-text">{t.hero.titleAccent}</span>
            </h1>

            <p className="mt-8 max-w-xl text-lg leading-relaxed text-zinc-400">
              {t.hero.subtitle}
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Button variant="neon" size="lg" onClick={() => setPilotOpen(true)}>
                {t.hero.ctaPilot}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  document.getElementById('pipeline-demo')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <Play className="h-4 w-4" />
                {t.hero.ctaDemo}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="glass-strong glow-ring rounded-lg p-8">
              <p className="section-label mb-6">System Metrics</p>
              <div className="space-y-6">
                {stats.map((s) => (
                  <div key={s.label} className="flex items-end justify-between border-b border-zinc-800 pb-4">
                    <span className="text-sm text-zinc-500">{s.label}</span>
                    <span className="font-mono text-3xl font-semibold text-white">{s.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="font-mono text-xs text-emerald-400">SOVEREIGN_TERMINAL :: ONLINE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PilotModal open={pilotOpen} onClose={() => setPilotOpen(false)} />
    </>
  )
}
