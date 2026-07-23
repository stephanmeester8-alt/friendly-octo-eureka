import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Square } from 'lucide-react'
import type { PipelineResult, PipelineStage } from '../../lib/types'
import { PIPELINE_STAGE_LABELS, simulatePipelineResult } from '../../lib/pipeline-simulator'
import { useAuthStore } from '../../store/useAuthStore'
import { useToastStore } from '../../store/useToastStore'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { PipelineProgress } from './PipelineProgress'
import { HitlModal } from './HitlModal'
import { DeliverablesView } from './DeliverablesView'

interface PipelineWorkspaceProps {
  onNeedCredits: () => void
}

export function PipelineWorkspace({ onNeedCredits }: PipelineWorkspaceProps) {
  const [prompt, setPrompt] = useState(
    'Conduct a comprehensive compliance and TCO migration audit for an enterprise client considering sovereign AI adoption.',
  )
  const [stage, setStage] = useState<PipelineStage>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [pendingResult, setPendingResult] = useState<PipelineResult | null>(null)
  const [showHitl, setShowHitl] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef(0)

  const { user, deductCredit } = useAuthStore()
  const { addToast } = useToastStore()

  const startTimer = useCallback(() => {
    startRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000)
    }, 100)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  useEffect(() => () => stopTimer(), [stopTimer])

  const runPipeline = async () => {
    if (!user) return
    if (user.credits <= 0) {
      onNeedCredits()
      return
    }
    if (!prompt.trim()) {
      addToast('Please enter a task prompt.', 'error')
      return
    }

    setResult(null)
    setPendingResult(null)
    setStage('antigravity')
    setElapsed(0)
    startTimer()

    // Stage 1: Antigravity
    await sleep(PIPELINE_STAGE_LABELS[0].durationMs)
    setStage('routing')

    // Stage 2: Gemini routing
    await sleep(PIPELINE_STAGE_LABELS[1].durationMs)
    const finalElapsed = (Date.now() - startRef.current) / 1000
    setElapsed(finalElapsed)
    stopTimer()

    const simulated = simulatePipelineResult(prompt, finalElapsed)
    setPendingResult(simulated)
    setStage('hitl')
    setShowHitl(true)
  }

  const handleApprove = () => {
    if (!pendingResult) return
    if (!deductCredit()) {
      addToast('Insufficient credits.', 'error')
      onNeedCredits()
      return
    }

    setShowHitl(false)
    setStage('deliverables')

    setTimeout(() => {
      setResult(pendingResult)
      setStage('complete')
      setPendingResult(null)
      addToast('Deliverables approved and generated. 1 credit deducted.', 'success')
    }, PIPELINE_STAGE_LABELS[3].durationMs)
  }

  const handleDeny = () => {
    setShowHitl(false)
    setStage('idle')
    setPendingResult(null)
    stopTimer()
    addToast('File writes denied. No credits deducted.', 'info')
  }

  const handleStop = () => {
    stopTimer()
    setStage('idle')
    setShowHitl(false)
    setPendingResult(null)
    addToast('Pipeline cancelled.', 'info')
  }

  const running = stage !== 'idle' && stage !== 'complete' && stage !== 'error'

  return (
    <div className="space-y-6">
      <Card glow>
        <h2 className="text-xl font-semibold text-white">AI Workspace</h2>
        <p className="mt-1 text-sm text-slate-400">
          Submit a complex enterprise task. The 4-stage sovereign pipeline will analyze,
          structure, request your approval, and deliver audit-ready artifacts.
        </p>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={running}
          rows={4}
          className="mt-4 w-full rounded-lg border border-slate-600/80 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50"
          placeholder="Describe your enterprise analysis task…"
        />

        <div className="mt-4 flex gap-3">
          <Button onClick={runPipeline} disabled={running}>
            <Play className="h-4 w-4" />
            Run Deep Analysis (1 credit)
          </Button>
          {running && (
            <Button variant="secondary" onClick={handleStop}>
              <Square className="h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </Card>

      {stage !== 'idle' && (
        <Card>
          <PipelineProgress stage={stage} elapsedSeconds={elapsed} />
        </Card>
      )}

      {result && stage === 'complete' && <DeliverablesView result={result} />}

      <HitlModal
        open={showHitl}
        files={pendingResult?.proposedFiles ?? []}
        summary={pendingResult?.summaryMarkdown ?? ''}
        onApprove={handleApprove}
        onDeny={handleDeny}
      />
    </div>
  )
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
