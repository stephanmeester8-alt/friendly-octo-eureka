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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="section-label">{t.pipeline.progress}</p>
        <span className="font-mono text-sm text-indigo-400">
          {elapsedSeconds.toFixed(1)}s {t.pipeline.elapsed}
        </span>
      </div>

      <div className="space-y-2">
        {PIPELINE_STAGE_LABELS.map((s, i) => {
          const done = current > i
          const active = current === i
          const pending = current < i

          return (
            <div
              key={s.key}
              className={clsx(
                'flex items-center gap-4 rounded-md border px-4 py-3.5 transition-all duration-500',
                done && 'border-emerald-500/20 bg-emerald-500/5',
                active && 'border-indigo-500/40 bg-indigo-500/5 glow-ring',
                pending && 'border-zinc-800 bg-zinc-950/50 opacity-50',
              )}
            >
              {done ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : active ? (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              ) : (
                <Circle className="h-4 w-4 text-zinc-700" />
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-zinc-200">
                  [{s.step}/4] {stageLabels[s.key]}
                </p>
                {active && <p className="font-mono text-[10px] text-zinc-500">{t.pipeline.processing}</p>}
              </div>
              <span className="font-mono text-[10px] text-zinc-600">{t.pipeline.step} {s.step}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
