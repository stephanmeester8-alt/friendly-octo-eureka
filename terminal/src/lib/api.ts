export interface SystemStatus {
  antigravity_agent: string
  routing_model: string
  vault_status: 'active' | 'locked'
  vault_configured: boolean
  credits: number
  output_dir: string
  active_runs: number
}

export interface VaultInfo {
  configured: boolean
  masked_key: string | null
  status: 'active' | 'locked'
}

export interface ProposedFile {
  filename: string
  description: string
  size_bytes: number
  preview?: string
}

export interface Deliverable {
  filename: string
  original?: string
  path?: string
  size_bytes: number
  description?: string
  content?: string
}

export interface PipelineEvent {
  stage: string
  elapsed_seconds: number
  message: string
  summary_markdown?: string
  proposed_files?: ProposedFile[]
  metadata?: Record<string, unknown>
  deliverables?: Deliverable[]
  manifest?: Record<string, unknown>
}

const API_BASE = import.meta.env.VITE_API_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Request failed')
  }
  return res.json() as Promise<T>
}

export const api = {
  getStatus: () => request<SystemStatus>('/api/status'),
  getVault: () => request<VaultInfo>('/api/vault'),
  setVault: (api_key: string) =>
    request<{ status: string; masked_key: string }>('/api/vault', {
      method: 'POST',
      body: JSON.stringify({ api_key }),
    }),
  addCredits: (amount: number) =>
    request<{ credits: number }>('/api/credits', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  startPipeline: (prompt: string) =>
    request<{ run_id: string }>('/api/pipeline/start', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),
  approve: (runId: string) =>
    request<{ approved: boolean }>(`/api/pipeline/${runId}/approve`, { method: 'POST' }),
  deny: (runId: string) =>
    request<{ approved: boolean }>(`/api/pipeline/${runId}/deny`, { method: 'POST' }),
  fileUrl: (filename: string) => `${API_BASE}/api/files/${encodeURIComponent(filename)}`,
}

export function connectPipelineStream(
  runId: string,
  onEvent: (event: PipelineEvent) => void,
  onError?: (err: Event) => void,
): EventSource {
  const source = new EventSource(`${API_BASE}/api/pipeline/${runId}/stream`)
  source.onmessage = (e) => {
    const data = JSON.parse(e.data) as PipelineEvent & { stage: string }
    if (data.stage !== 'stream_end') onEvent(data)
  }
  source.onerror = (e) => onError?.(e)
  return source
}
