import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Coins, KeyRound, LogOut, Rocket, Shield, User } from 'lucide-react'
import { PipelineWorkspace } from '../components/dashboard/PipelineWorkspace'
import { CreditTopUpModal } from '../components/billing/CreditTopUpModal'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher'
import { useAuthStore } from '../store/useAuthStore'
import { useToastStore } from '../store/useToastStore'
import { useTranslation } from '../store/useLocaleStore'
import { maskApiKey } from '../lib/storage'

export function DashboardPage() {
  const { user, initialized, init, signOut, updateApiKey, getApiKey } = useAuthStore()
  const { addToast } = useToastStore()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showTopUp, setShowTopUp] = useState(false)

  useEffect(() => { init() }, [init])
  useEffect(() => {
    if (initialized && !user) navigate('/login')
  }, [initialized, user, navigate])

  if (!initialized || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  const existingKey = getApiKey()
  const creditPct = Math.min(100, (user.credits / 10) * 100)

  const handleSaveKey = () => {
    if (!apiKeyInput.trim()) {
      addToast(t.dashboard.keyInvalid, 'error')
      return
    }
    updateApiKey(apiKeyInput.trim())
    setApiKeyInput('')
    addToast(t.dashboard.keySaved, 'success')
  }

  const tierBadge = {
    trial: 'info' as const,
    pilot: 'indigo' as const,
    pro: 'neon' as const,
    enterprise: 'warning' as const,
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="terminal-grid pointer-events-none fixed inset-0 opacity-20" />

      <header className="relative border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">{t.dashboard.title}</span>
            <Badge variant="neon" className="ml-2 hidden sm:inline-flex">LIVE</Badge>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Badge variant={tierBadge[user.tier]}>{user.tier}</Badge>
            <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate('/'))}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <PipelineWorkspace onNeedCredits={() => setShowTopUp(true)} />
          </div>

          <div className="space-y-4 lg:col-span-4">
            {/* Credit Monitor */}
            <Card strong glow>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-white">{t.dashboard.creditMonitor}</span>
                </div>
                <span className="font-mono text-2xl font-bold text-white">{user.credits}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{t.dashboard.creditMonitorSub}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${creditPct}%` }}
                />
              </div>
              <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => setShowTopUp(true)}>
                {t.dashboard.topUp}
              </Button>
            </Card>

            {/* BYOK Vault */}
            <Card strong>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-white">{t.dashboard.vault}</span>
                </div>
                <Badge variant={existingKey ? 'neon' : 'default'}>
                  {existingKey ? t.dashboard.vaultActive : t.dashboard.vaultLocked}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-zinc-500">{t.dashboard.vaultSub}</p>
              {existingKey && (
                <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3 font-mono text-xs text-emerald-400/80">
                  {maskApiKey(existingKey)}
                </div>
              )}
              <div className="mt-4 space-y-2">
                <Input
                  type="password"
                  placeholder="AQ.••••••••"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                />
                <Button variant="primary" size="sm" className="w-full" onClick={handleSaveKey}>
                  {t.dashboard.saveKey}
                </Button>
              </div>
            </Card>

            {/* Operator */}
            <Card>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-semibold text-white">{t.dashboard.profile}</span>
              </div>
              <p className="mt-3 font-mono text-xs text-zinc-500">{user.email}</p>
            </Card>

            <Button variant="neon" className="w-full" onClick={() => navigate('/pilot')}>
              <Rocket className="h-4 w-4" />
              {t.dashboard.requestPilot}
            </Button>
          </div>
        </div>
      </main>

      <CreditTopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} />
    </div>
  )
}
