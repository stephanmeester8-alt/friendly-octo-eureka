import { useTranslation } from '../../store/useLocaleStore'

export function SecuritySection() {
  const { t } = useTranslation()

  return (
    <section id="security" className="border-t border-zinc-800/50 bg-zinc-950 px-4 py-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12">
          <p className="section-label">{t.security.label}</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">{t.security.title}</h2>
          <p className="mt-4 max-w-xl text-zinc-400">{t.security.subtitle}</p>
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-6 py-4 font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500">Layer</th>
                <th className="px-6 py-4 font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500">Component</th>
                <th className="px-6 py-4 font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {t.security.steps.map((step, i) => (
                <tr key={step} className="hover:bg-zinc-900/30">
                  <td className="px-6 py-4 font-mono text-zinc-600">0{i + 1}</td>
                  <td className="px-6 py-4 font-medium text-zinc-200">{step}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 font-mono text-xs text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
