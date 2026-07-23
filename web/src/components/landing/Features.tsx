import { Key, Lock, FileCheck } from 'lucide-react'
import { Card } from '../ui/Card'
import { useTranslation } from '../../store/useLocaleStore'

export function Features() {
  const { t } = useTranslation()

  const features = [
    { icon: Key, ...t.features.byok, accent: 'text-blue-400' },
    { icon: Lock, ...t.features.hitl, accent: 'text-indigo-400' },
    { icon: FileCheck, ...t.features.audit, accent: 'text-emerald-400' },
  ]

  return (
    <section id="features" className="border-t border-zinc-800/50 px-4 py-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="section-label">{t.features.label}</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">{t.features.title}</h2>
            <p className="mt-6 text-zinc-400 leading-relaxed">{t.features.subtitle}</p>
          </div>

          <div className="space-y-4 lg:col-span-8">
            {features.map((feature, i) => (
              <Card key={feature.title} className="group hover:border-zinc-700">
                <div className="flex gap-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950">
                    <feature.icon className={`h-5 w-5 ${feature.accent}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-zinc-600">0{i + 1}</span>
                      <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">{feature.description}</p>
                    <ul className="mt-4 flex flex-wrap gap-3">
                      {feature.bullets.map((b) => (
                        <li
                          key={b}
                          className="rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-1 font-mono text-[11px] text-zinc-500"
                        >
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
