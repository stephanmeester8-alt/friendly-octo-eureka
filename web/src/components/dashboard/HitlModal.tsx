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

      <div className="mb-4 max-h-32 overflow-y-auto rounded-lg bg-slate-900/60 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{t.hitl.summary}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300 line-clamp-4">
          {summary.slice(0, 500)}…
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/80 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">{t.hitl.filename}</th>
              <th className="px-4 py-3">{t.hitl.description}</th>
              <th className="px-4 py-3 text-right">{t.hitl.size}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {files.map((file) => (
              <tr key={file.filename} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 font-mono text-cyan-300">{file.filename}</td>
                <td className="px-4 py-3 text-slate-400">{file.description}</td>
                <td className="px-4 py-3 text-right text-slate-400">
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
        <Button onClick={onApprove}>
          <Check className="h-4 w-4" />
          {t.hitl.approve}
        </Button>
      </div>
    </Modal>
  )
}
