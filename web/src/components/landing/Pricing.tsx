import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { useTranslation } from '../../store/useLocaleStore'

const TIER_IDS = ['trial', 'pilot', 'pro', 'enterprise'] as const
const TIER_PRICES: Record<string, string> = {
  trial: '€0',
  pilot: '€3.500',
  pro: '€50',
  enterprise: 'Custom',
}
const HIGHLIGHTED = 'pilot'

export function Pricing() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleCta = (tierId: string) => {
    if (tierId === 'trial' || tierId === 'pro') navigate('/signup')
    else if (tierId === 'pilot') navigate('/pilot')
    else window.location.href = 'mailto:sales@sovereignai.io?subject=Enterprise%20Inquiry'
  }

  return (
    <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">{t.pricing.title}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">{t.pricing.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {TIER_IDS.map((id) => {
            const tier = t.pricing.tiers[id]
            const highlighted = id === HIGHLIGHTED
            return (
              <Card
                key={id}
                glow={highlighted}
                className={`flex flex-col ${highlighted ? 'border-cyan-500/40' : ''}`}
              >
                {highlighted && (
                  <span className="mb-3 inline-block w-fit rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-300">
                    {t.pricing.mostPopular}
                  </span>
                )}
                <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{TIER_PRICES[id]}</span>
                  <span className="text-sm text-slate-400">/ {tier.period}</span>
                </div>
                <p className="mt-3 text-sm text-slate-400">{tier.description}</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={highlighted ? 'primary' : 'secondary'}
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
  )
}
