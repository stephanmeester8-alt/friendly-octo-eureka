import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import type { PipelineStage } from '../../lib/types'
import { PIPELINE_STAGE_LABELS } from '../../lib/pipeline-simulator'
import { useTranslation } from '../../store/useLocaleStore'

interface PipelineProgressProps {
  stage: PipelineStage
  elapsedSeconds: number
}

const stageOrder: PipelineStage[] = ['antigravity', 'routing', 'hitl', 'deliverables', 'complete']

function stageIndex(stage: PipelineStage): number {
  if (stage === 'idle' || stage === 'error') return -1
  if (stage === 'complete') return 4
  return stageOrder.indexOf(stage)
}

export function PipelineProgress({ stage, elapsedSeconds }: PipelineProgressProps) {
  const { t } = useTranslation()
  const current = stageIndex(stage)

  const stageLabels: Record<string, string> = {
    antigravity: t.pipeline.stages.antigravity,
    routing: t.pipeline.stages.routing,
    hitl: t.pipeline.stages.hitl,
    deliverables: t.pipeline.stages.deliverables,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">{t.pipeline.progress}</h3>
        <span className="font-mono text-sm text-cyan-400">
          {elapsedSeconds.toFixed(1)}s {t.pipeline.elapsed}
        </span>
      </div>

      <div className="space-y-3">
        {PIPELINE_STAGE_LABELS.map((s, i) => {
          const done = current > i
          const active = current === i
          const pending = current < i

          return (
            <div
              key={s.key}
              className={clsx(
                'flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-300',
                done && 'border-emerald-500/30 bg-emerald-500/5',
                active && 'border-cyan-500/40 bg-cyan-500/10 glow-ring',
                pending && 'border-slate-700/50 bg-slate-900/40 opacity-60',
              )}
            >
              {done ? (
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              ) : active ? (
                <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
              ) : (
                <Circle className="h-5 w-5 text-slate-600" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  [{s.step}/4] {stageLabels[s.key]}
                </p>
                {active && s.durationMs > 0 && (
                  <p className="text-xs text-slate-400">{t.pipeline.processing}</p>
                )}
              </div>
              <span className="text-xs text-slate-500">{t.pipeline.step} {s.step}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
