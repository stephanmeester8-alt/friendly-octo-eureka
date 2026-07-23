import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { PilotModal } from './PilotModal'
import { useTranslation } from '../../store/useLocaleStore'

const TIER_IDS = ['demo', 'pilot', 'enterprise', 'retainer'] as const
const TIER_PRICES: Record<string, string> = {
  demo: '€0',
  pilot: '€3.500',
  enterprise: '€15K – €35K',
  retainer: 'Custom',
}

export function Pricing() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [pilotOpen, setPilotOpen] = useState(false)

  const handleCta = (tierId: string) => {
    if (tierId === 'demo') navigate('/signup')
    else if (tierId === 'pilot') setPilotOpen(true)
    else if (tierId === 'retainer') setPilotOpen(true)
    else window.location.href = 'mailto:sales@sovereignai.io?subject=Enterprise%20Quote'
  }

  return (
    <>
      <section id="pricing" className="border-t border-zinc-800/50 px-4 py-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 max-w-2xl">
            <p className="section-label">{t.pricing.label}</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">{t.pricing.title}</h2>
            <p className="mt-4 text-zinc-400">{t.pricing.subtitle}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {TIER_IDS.map((id) => {
              const tier = t.pricing.tiers[id]
              const highlighted = id === 'pilot'
              return (
                <Card
                  key={id}
                  glow={highlighted}
                  strong={highlighted}
                  className={`flex flex-col ${highlighted ? 'border-indigo-500/40' : ''}`}
                >
                  {highlighted && (
                    <span className="mb-4 inline-block w-fit rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-indigo-300">
                      {t.pricing.mostPopular}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold text-white">{TIER_PRICES[id]}</span>
                    <span className="text-xs text-zinc-500">/ {tier.period}</span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-zinc-400">{tier.description}</p>
                  <ul className="mt-6 flex-1 space-y-3 border-t border-zinc-800 pt-6">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={highlighted ? 'neon' : 'secondary'}
                    className="mt-8 w-full"
                    onClick={() => handleCta(id)}
                  >
                    {tier.cta}
                  </Button>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <PilotModal open={pilotOpen} onClose={() => setPilotOpen(false)} />
    </>
  )
}
