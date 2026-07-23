import { FileCheck, Key, ShieldCheck } from 'lucide-react'
import { Card } from '../ui/Card'

const features = [
  {
    icon: Key,
    title: 'Bring Your Own Key (BYOK)',
    description:
      'Connect your Gemini API key and pay only for tokens consumed. Eliminate per-employee SaaS subscriptions — typically 80% lower total cost of ownership.',
    bullets: ['No monthly seat licenses', 'Direct provider billing', 'Full cost transparency'],
  },
  {
    icon: ShieldCheck,
    title: 'Human-In-The-Loop (HITL) Security Gate',
    description:
      'AI reasons and proposes deliverables, but every local file write requires explicit human approval. Zero autonomous mutations — ever.',
    bullets: ['Approve / deny file writes', 'Preview before persistence', 'Audit trail per decision'],
  },
  {
    icon: FileCheck,
    title: 'Audit-Ready Artifacts',
    description:
      'Every pipeline run generates structured Markdown reports, numbered deliverables, INDEX.md, and run_manifest.json for compliance teams.',
    bullets: ['Structured deliverable index', 'Machine-readable manifests', 'Export-ready reports'],
  },
]

export function Features() {
  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Built for Regulated Industries
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            SovereignAI Workspace combines enterprise security controls with the cost
            efficiency of bring-your-own-key architecture.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="hover:border-cyan-500/30">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
                <feature.icon className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {feature.description}
              </p>
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
