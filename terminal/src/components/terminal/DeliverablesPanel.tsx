import { Download, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Deliverable } from '@/lib/api'
import { api } from '@/lib/api'
import { formatBytes } from '@/lib/utils'

interface DeliverablesPanelProps {
  deliverables: Deliverable[]
  manifest: Record<string, unknown>
  elapsed: number
}

export function DeliverablesPanel({ deliverables, manifest, elapsed }: DeliverablesPanelProps) {
  if (!deliverables.length) return null

  return (
    <Card className="glass-strong glow-ring mt-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-emerald-400" />
          <div>
            <CardTitle>Safe Deliverables</CardTitle>
            <CardDescription>
              {deliverables.length} artifacts · {elapsed.toFixed(1)}s · ./output/
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {deliverables.map((d) => (
          <div
            key={d.filename}
            className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/40 px-4 py-3"
          >
            <div>
              <p className="font-mono text-sm text-indigo-300">{d.filename}</p>
              <p className="text-xs text-zinc-500">
                {d.description ?? 'Approved artifact'} · {formatBytes(d.size_bytes)}
              </p>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <a href={api.fileUrl(d.filename)} download>
                <Download className="h-4 w-4" />
                Download
              </a>
            </Button>
          </div>
        ))}

        <div className="mt-4">
          <p className="section-label mb-2">run_manifest.json</p>
          <pre className="max-h-48 overflow-auto rounded-md border border-zinc-800 bg-zinc-950/80 p-4 font-mono text-xs text-emerald-300/90">
            {JSON.stringify(manifest, null, 2)}
          </pre>
          <Button variant="secondary" size="sm" className="mt-3" asChild>
            <a href={api.fileUrl('run_manifest.json')} download>
              <Download className="h-4 w-4" />
              Download Manifest
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
