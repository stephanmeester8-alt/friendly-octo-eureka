import { FileCheck, Key, ShieldCheck } from 'lucide-react'
import { Card } from '../ui/Card'
import { useTranslation } from '../../store/useLocaleStore'

export function Features() {
  const { t } = useTranslation()

  const features = [
    { icon: Key, ...t.features.byok },
    { icon: ShieldCheck, ...t.features.hitl },
    { icon: FileCheck, ...t.features.audit },
  ]

  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">{t.features.title}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">{t.features.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="hover:border-cyan-500/30">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
                <feature.icon className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{feature.description}</p>
              <ul className="mt-4 space-y-2">
                {feature.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    {b}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
