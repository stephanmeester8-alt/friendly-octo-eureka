import { AlertTriangle, Check, X } from 'lucide-react'
import type { ProposedFile } from '../../lib/types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useTranslation } from '../../store/useLocaleStore'

interface HitlModalProps {
  open: boolean
  files: ProposedFile[]
  summary: string
  onApprove: () => void
  onDeny: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export function HitlModal({ open, files, summary, onApprove, onDeny }: HitlModalProps) {
  const { t } = useTranslation()

  return (
    <Modal open={open} onClose={onDeny} title={t.hitl.title} size="xl">
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div>
          <p className="text-sm font-medium text-amber-200">{t.hitl.warningTitle}</p>
          <p className="mt-1 text-xs text-amber-200/70">{t.hitl.warningBody}</p>
        </div>
      </div>

      <div className="mb-4 max-h-32 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">{t.hitl.summary}</p>
        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-zinc-300">
          {summary.slice(0, 500)}…
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/80 font-mono text-[11px] uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">{t.hitl.filename}</th>
              <th className="px-4 py-3">{t.hitl.description}</th>
              <th className="px-4 py-3 text-right">{t.hitl.size}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {files.map((file) => (
              <tr key={file.filename} className="hover:bg-zinc-900/40">
                <td className="px-4 py-3 font-mono text-indigo-300">{file.filename}</td>
                <td className="px-4 py-3 text-zinc-400">{file.description}</td>
                <td className="px-4 py-3 text-right text-zinc-500">
                  {formatSize(file.sizeBytes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="danger" onClick={onDeny}>
          <X className="h-4 w-4" />
          {t.hitl.deny}
        </Button>
        <Button variant="neon" onClick={onApprove}>
          <Check className="h-4 w-4" />
          {t.hitl.approve}
        </Button>
      </div>
    </Modal>
  )
}
