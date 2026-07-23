import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { StatusCards } from '@/components/terminal/StatusCards'
import { SidebarPanels } from '@/components/terminal/SidebarPanels'
import { PipelineStages } from '@/components/terminal/PipelineStages'
import { HitlDialog } from '@/components/terminal/HitlDialog'
import { DeliverablesPanel } from '@/components/terminal/DeliverablesPanel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  api,
  connectPipelineStream,
  type Deliverable,
  type PipelineEvent,
  type ProposedFile,
} from '@/lib/api'
import { formatElapsed } from '@/lib/utils'

const DEFAULT_PROMPT =
  'Voer een compliance- en TCO-migratie-audit uit voor een enterprise-klant die overstapt op sovereign AI met BYOK en HITL-controle.'

export const Route = createFileRoute('/')({
  component: TerminalDashboard,
})

function TerminalDashboard() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [stage, setStage] = useState('idle')
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)
  const [hitlOpen, setHitlOpen] = useState(false)
  const [hitlSummary, setHitlSummary] = useState('')
  const [hitlFiles, setHitlFiles] = useState<ProposedFile[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [manifest, setManifest] = useState<Record<string, unknown>>({})

  const eventSourceRef = useRef<EventSource | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const queryClient = useQueryClient()

  const startTimer = useCallback(() => {
    const start = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - start) / 1000)
    }, 100)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  useEffect(() => () => {
    stopTimer()
    eventSourceRef.current?.close()
  }, [stopTimer])

  const handleEvent = useCallback((event: PipelineEvent) => {
    setStage(event.stage)
    if (event.elapsed_seconds) setElapsed(event.elapsed_seconds)

    if (event.stage === 'hitl') {
      setHitlSummary(event.summary_markdown ?? '')
      setHitlFiles(event.proposed_files ?? [])
      setHitlOpen(true)
    }

    if (event.stage === 'deliverables') setHitlOpen(false)

    if (event.stage === 'complete') {
      setHitlOpen(false)
      stopTimer()
      setRunning(false)
      setDeliverables(event.deliverables ?? [])
      setManifest(event.manifest ?? {})
      toast.success('Pipeline complete — deliverables ready')
      queryClient.invalidateQueries({ queryKey: ['status'] })
      eventSourceRef.current?.close()
    }

    if (event.stage === 'denied') {
      setHitlOpen(false)
      stopTimer()
      setRunning(false)
      toast.info('Writes denied — no files saved to disk')
      eventSourceRef.current?.close()
    }

    if (event.stage === 'error') {
      setHitlOpen(false)
      stopTimer()
      setRunning(false)
      toast.error(event.message)
      eventSourceRef.current?.close()
    }
  }, [queryClient, stopTimer])

  const startMutation = useMutation({
    mutationFn: () => api.startPipeline(prompt.trim()),
    onSuccess: ({ run_id }) => {
      setRunId(run_id)
      setStage('antigravity')
      setDeliverables([])
      setManifest({})
      startTimer()
      eventSourceRef.current?.close()
      eventSourceRef.current = connectPipelineStream(run_id, handleEvent)
      toast.info(`Pipeline started — run ${run_id}`)
    },
    onError: (e: Error) => {
      stopTimer()
      setRunning(false)
      toast.error(e.message)
    },
  })

  const approveMutation = useMutation({
    mutationFn: () => api.approve(runId!),
    onSuccess: () => {
      setHitlOpen(false)
      setStage('deliverables')
      toast.success('Approval granted — writing files…')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const denyMutation = useMutation({
    mutationFn: () => api.deny(runId!),
    onSuccess: () => setHitlOpen(false),
    onError: (e: Error) => toast.error(e.message),
  })

  const handleStart = () => {
    if (prompt.trim().length < 10) {
      toast.error('Enter a task description (min. 10 characters)')
      return
    }
    setRunning(true)
    setElapsed(0)
    startMutation.mutate()
  }

  const handleCancel = () => {
    if (runId) denyMutation.mutate()
    eventSourceRef.current?.close()
    stopTimer()
    setRunning(false)
    setHitlOpen(false)
    setStage('idle')
    toast.info('Run cancelled')
  }

  return (
    <div className="relative min-h-screen">
      <div className="terminal-grid pointer-events-none fixed inset-0 opacity-20" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="mb-8 flex items-center justify-between border-b border-zinc-800/60 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-indigo-500/30 bg-indigo-600/20">
              <Shield className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                SovereignAI <span className="gradient-text">Terminal</span>
              </h1>
              <p className="section-label">Enterprise Grade · TanStack Start</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="live">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              LIVE
            </Badge>
            {running && (
              <span className="font-mono text-sm text-indigo-400">{formatElapsed(elapsed)}</span>
            )}
          </div>
        </header>

        <StatusCards />

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="glass-strong glow-ring">
              <CardHeader>
                <p className="section-label">Analysis Terminal</p>
                <CardTitle>Submit Enterprise Task</CardTitle>
                <CardDescription>
                  GWW tender analysis, compliance audits, financial TCO reviews — routed through
                  Antigravity → Gemini → HITL gate.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={running}
                  rows={5}
                  placeholder="Describe your enterprise analysis task…"
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    variant="neon"
                    disabled={running || startMutation.isPending}
                    onClick={handleStart}
                  >
                    <Play className="h-4 w-4" />
                    Start Analysis — 1 credit
                  </Button>
                  {running && (
                    <Button variant="secondary" onClick={handleCancel}>
                      <Square className="h-4 w-4" />
                      Cancel
                    </Button>
                  )}
                </div>

                {stage !== 'idle' && (
                  <PipelineStages currentStage={stage} elapsed={elapsed} />
                )}
              </CardContent>
            </Card>

            <DeliverablesPanel
              deliverables={deliverables}
              manifest={manifest}
              elapsed={elapsed}
            />
          </div>

          <SidebarPanels />
        </div>
      </div>

      <HitlDialog
        open={hitlOpen}
        summary={hitlSummary}
        files={hitlFiles}
        onApprove={() => approveMutation.mutate()}
        onDeny={() => denyMutation.mutate()}
        loading={approveMutation.isPending || denyMutation.isPending}
      />
    </div>
  )
}
