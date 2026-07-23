import { Shield } from 'lucide-react'
import { useTranslation } from '../../store/useLocaleStore'

export function SecuritySection() {
  const { t } = useTranslation()

  return (
    <section id="security" className="border-y border-slate-800/80 bg-slate-900/30 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <Shield className="h-12 w-12 text-cyan-400" />
        <h2 className="mt-6 text-3xl font-bold text-white">{t.security.title}</h2>
        <p className="mt-4 text-slate-400">{t.security.subtitle}</p>
        <div className="mt-10 grid w-full gap-4 sm:grid-cols-4">
          {t.security.steps.map((step, i) => (
            <div key={step} className="glass rounded-xl p-4">
              <div className="text-2xl font-bold text-cyan-400">{i + 1}</div>
              <p className="mt-1 text-sm font-medium text-white">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
