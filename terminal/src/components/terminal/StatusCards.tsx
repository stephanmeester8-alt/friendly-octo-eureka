import { Shield, Coins, KeyRound, FolderOpen } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'

export function StatusCards() {
  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: api.getStatus,
    refetchInterval: 15_000,
  })

  const { data: vault } = useQuery({
    queryKey: ['vault'],
    queryFn: api.getVault,
    refetchInterval: 15_000,
  })

  const cards = [
    {
      icon: Shield,
      label: 'Antigravity Agent',
      value: status ? 'ONLINE' : '—',
      sub: status ? `${status.antigravity_agent}` : 'Connecting…',
      accent: 'text-indigo-400',
    },
    {
      icon: KeyRound,
      label: 'BYOK Key Vault',
      value: vault?.configured ? 'ACTIVE' : 'LOCKED',
      sub: vault?.masked_key ?? 'Configure API key',
      accent: vault?.configured ? 'text-emerald-400' : 'text-zinc-500',
    },
    {
      icon: Coins,
      label: 'Credit Monitor',
      value: status ? String(status.credits) : '—',
      sub: '1 credit per approved run',
      accent: 'text-emerald-400',
    },
    {
      icon: FolderOpen,
      label: 'Output Directory',
      value: './output/',
      sub: 'HITL-gated writes only',
      accent: 'text-zinc-400',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <c.icon className={`h-4 w-4 ${c.accent}`} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{c.label}</span>
            </div>
            <p className="mt-3 font-mono text-2xl font-semibold text-white">{c.value}</p>
            <p className="mt-1 text-xs text-zinc-500">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
      {status && status.active_runs > 0 && (
        <div className="col-span-full">
          <Badge variant="active">{status.active_runs} active pipeline run(s)</Badge>
        </div>
      )}
    </div>
  )
}
