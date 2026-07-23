import { Download, FileText } from 'lucide-react'
import type { PipelineResult } from '../../lib/types'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useTranslation } from '../../store/useLocaleStore'

interface DeliverablesViewProps {
  result: PipelineResult
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export function DeliverablesView({ result }: DeliverablesViewProps) {
  const { t } = useTranslation()
  const indexFile = result.artifacts.find((a) => a.filename === 'INDEX.md')

  return (
    <div className="space-y-6">
      <Card glow>
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-emerald-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">{t.deliverables.title}</h3>
            <p className="text-sm text-zinc-400">
              {result.artifacts.length} {t.deliverables.generated} {result.elapsedSeconds.toFixed(1)}s
            </p>
          </div>
        </div>
      </Card>

      {indexFile && (
        <Card>
          <h4 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            {t.deliverables.index}
          </h4>
          <pre className="max-h-48 overflow-auto rounded-md border border-zinc-800 bg-zinc-950/80 p-4 font-mono text-xs text-zinc-300">
            {indexFile.content}
          </pre>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => downloadFile('INDEX.md', indexFile.content)}
          >
            <Download className="h-4 w-4" />
            {t.deliverables.downloadIndex}
          </Button>
        </Card>
      )}

      <Card>
        <h4 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          {t.deliverables.numbered}
        </h4>
        <div className="space-y-2">
          {result.artifacts
            .filter((a) => a.filename !== 'INDEX.md')
            .map((artifact) => (
              <div
                key={artifact.filename}
                className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/40 px-4 py-3"
              >
                <div>
                  <p className="font-mono text-sm text-indigo-300">{artifact.filename}</p>
                  <p className="text-xs text-zinc-500">
                    {artifact.description} · {formatSize(artifact.sizeBytes)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadFile(artifact.filename, artifact.content)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
        </div>
      </Card>

      <Card>
        <h4 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          {t.deliverables.manifest}
        </h4>
        <pre className="max-h-40 overflow-auto rounded-md border border-zinc-800 bg-zinc-950/80 p-4 font-mono text-xs text-emerald-300/90">
          {JSON.stringify(result.manifest, null, 2)}
        </pre>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() =>
            downloadFile('run_manifest.json', JSON.stringify(result.manifest, null, 2))
          }
        >
          <Download className="h-4 w-4" />
          {t.deliverables.downloadManifest}
        </Button>
      </Card>
    </div>
  )
}
