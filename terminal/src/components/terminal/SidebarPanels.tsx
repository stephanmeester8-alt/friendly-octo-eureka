import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/api'

export function SidebarPanels() {
  const [apiKey, setApiKey] = useState('')
  const queryClient = useQueryClient()

  const { data: vault } = useQuery({ queryKey: ['vault'], queryFn: api.getVault })
  const { data: status } = useQuery({ queryKey: ['status'], queryFn: api.getStatus })

  const saveVault = useMutation({
    mutationFn: () => api.setVault(apiKey),
    onSuccess: () => {
      toast.success('API key saved to local vault')
      setApiKey('')
      queryClient.invalidateQueries({ queryKey: ['vault'] })
      queryClient.invalidateQueries({ queryKey: ['status'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const topUp = useMutation({
    mutationFn: () => api.addCredits(10),
    onSuccess: (res) => {
      toast.success(`+10 credits — balance: ${res.credits}`)
      queryClient.invalidateQueries({ queryKey: ['status'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const creditPct = status ? Math.min(100, (status.credits / 10) * 100) : 0

  return (
    <div className="space-y-4">
      <Card className="glass-strong">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-indigo-400" />
            <CardTitle className="text-base">BYOK Vault</CardTitle>
          </div>
          <CardDescription>Encrypted in process memory. Never sent externally.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant={vault?.configured ? 'live' : 'locked'}>
            {vault?.configured ? 'ACTIVE' : 'LOCKED'}
          </Badge>
          {vault?.masked_key && (
            <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-emerald-400/80">
              {vault.masked_key}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="vault-key">API Key</Label>
            <Input
              id="vault-key"
              type="password"
              placeholder="AQ.••••••••"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <Button
              className="w-full"
              size="sm"
              disabled={apiKey.length < 8 || saveVault.isPending}
              onClick={() => saveVault.mutate()}
            >
              Save Key to Vault
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credit Monitor</CardTitle>
          <CardDescription>Deducted only on HITL approval.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold">{status?.credits ?? '—'}</span>
            <Badge variant="active">ACTIVE</Badge>
          </div>
          <Progress value={creditPct} className="mt-4" />
          <Button
            variant="secondary"
            size="sm"
            className="mt-4 w-full"
            disabled={topUp.isPending}
            onClick={() => topUp.mutate()}
          >
            +10 Demo Credits
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
