import { useState } from 'react'
import { Play } from 'lucide-react'
import type { PipelineStage } from '../../lib/types'
import { PipelineProgress } from '../dashboard/PipelineProgress'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { useTranslation } from '../../store/useLocaleStore'

export function PipelineDemo() {
  const { t } = useTranslation()
  const [stage, setStage] = useState<PipelineStage>('idle')
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const runDemo = async () => {
    setRunning(true)
    setElapsed(0)
    const start = Date.now()
    const tick = setInterval(() => setElapsed((Date.now() - start) / 1000), 100)

    setStage('antigravity')
    await sleep(3000)
    setStage('routing')
    await sleep(2500)
    setStage('hitl')
    await sleep(2000)
    setStage('deliverables')
    await sleep(1500)
    setStage('complete')

    clearInterval(tick)
    setElapsed((Date.now() - start) / 1000)
    setRunning(false)
  }

  const stageOrder: PipelineStage[] = ['antigravity', 'routing', 'hitl', 'deliverables', 'complete']

  return (
    <section id="pipeline-demo" className="border-t border-zinc-800/50 px-4 py-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-2xl">
          <p className="section-label">{t.pipeline.label}</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">{t.pipeline.title}</h2>
          <p className="mt-4 text-zinc-400">{t.pipeline.subtitle}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          <Card strong glow className="lg:col-span-3">
            {stage === 'idle' ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950">
                  <Play className="h-6 w-6 text-indigo-400" />
                </div>
                <p className="font-mono text-sm text-zinc-500">PIPELINE_IDLE</p>
                <Button className="mt-6" variant="primary" onClick={runDemo} disabled={running}>
                  {t.pipeline.runDemo}
                </Button>
              </div>
            ) : (
              <PipelineProgress stage={stage} elapsedSeconds={elapsed} />
            )}
          </Card>

          <div className="space-y-4 lg:col-span-2">
            {t.security.steps.map((step, i) => (
              <div
                key={step}
                className={`glass rounded-lg px-5 py-4 transition-all ${
                  stage !== 'idle' && i <= stageOrder.indexOf(stage)
                    ? 'border-indigo-500/30'
                    : ''
                }`}
              >
                <span className="font-mono text-xs text-zinc-600">STEP_0{i + 1}</span>
                <p className="mt-1 text-sm font-medium text-zinc-200">{step}</p>
              </div>
            ))}
            {stage === 'complete' && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
                <span className="font-mono text-xs text-emerald-400">STATUS :: COMPLETE</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
