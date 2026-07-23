import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import { cn, formatElapsed } from '@/lib/utils'

const STAGES = [
  { key: 'antigravity', step: 1, title: 'Antigravity Agent — Deep Analysis', sub: 'Background reasoning & research' },
  { key: 'routing', step: 2, title: 'Gemini Router — Cost-Optimized Structuring', sub: 'JSON schema via previous_interaction_id' },
  { key: 'hitl', step: 3, title: 'HITL Security Gate', sub: 'Explicit operator approval required' },
  { key: 'deliverables', step: 4, title: 'Safe Deliverable View', sub: 'INDEX.md · numbered artifacts · run_manifest.json' },
] as const

interface PipelineStagesProps {
  currentStage: string
  elapsed: number
}

function stageIndex(stage: string): number {
  const idx = STAGES.findIndex((s) => s.key === stage)
  if (stage === 'complete' || stage === 'denied') return 4
  return idx
}

export function PipelineStages({ currentStage, elapsed }: PipelineStagesProps) {
  const current = stageIndex(currentStage)

  return (
    <div className="mt-6 space-y-2">
      {STAGES.map((s, i) => {
        const done = current > i || currentStage === 'complete'
        const active = current === i && currentStage !== 'complete' && currentStage !== 'denied'
        const pending = current < i && currentStage !== 'complete'

        return (
          <div
            key={s.key}
            className={cn(
              'flex items-center gap-4 rounded-md border px-4 py-3.5 transition-all duration-500',
              done && 'border-emerald-500/20 bg-emerald-500/5',
              active && 'border-indigo-500/40 bg-indigo-500/5 glow-ring',
              pending && 'border-zinc-800 bg-zinc-950/50 opacity-50',
            )}
          >
            {done ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : active ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-400" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-zinc-700" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-200">
                [{s.step}/4] {s.title}
              </p>
              <p className="font-mono text-[10px] text-zinc-500">{s.sub}</p>
            </div>
            {active && (
              <span className="font-mono text-xs text-indigo-400">{formatElapsed(elapsed)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
