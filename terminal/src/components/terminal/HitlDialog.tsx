import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ProposedFile } from '@/lib/api'
import { formatBytes } from '@/lib/utils'

interface HitlDialogProps {
  open: boolean
  summary: string
  files: ProposedFile[]
  onApprove: () => void
  onDeny: () => void
  loading?: boolean
}

export function HitlDialog({ open, summary, files, onApprove, onDeny, loading }: HitlDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDeny()}>
      <DialogContent onKeyDown={(e) => {
        if (e.key === 'y' || e.key === 'Y') onApprove()
        if (e.key === 'n' || e.key === 'N') onDeny()
      }}>
        <DialogHeader>
          <DialogTitle>HITL Security Gate</DialogTitle>
          <Badge variant="warning">AWAITING APPROVAL</Badge>
        </DialogHeader>

        <div className="mb-4 flex gap-3 rounded-md border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <strong>Human approval required</strong>
            <p className="mt-1 text-xs text-amber-200/70">
              No file will be written to disk without clicking Approve Write [Y].
            </p>
          </div>
        </div>

        <p className="section-label mb-2">Summary</p>
        <div className="mb-4 max-h-32 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-300 whitespace-pre-wrap">
          {summary.slice(0, 2000)}
        </div>

        <div className="overflow-hidden rounded-md border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900/80 font-mono text-[10px] uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {files.map((f) => (
                <tr key={f.filename} className="hover:bg-zinc-900/40">
                  <td className="px-4 py-3 font-mono text-indigo-300">{f.filename}</td>
                  <td className="px-4 py-3 text-zinc-400">{f.description}</td>
                  <td className="px-4 py-3 text-right text-zinc-500">{formatBytes(f.size_bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="danger" onClick={onDeny} disabled={loading}>
            Deny [N]
          </Button>
          <Button variant="neon" onClick={onApprove} disabled={loading}>
            Approve Write [Y]
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
