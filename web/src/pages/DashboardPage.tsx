import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Coins,
  CreditCard,
  Key,
  LogOut,
  Rocket,
  Shield,
  User,
} from 'lucide-react'
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

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (initialized && !user) navigate('/login')
  }, [initialized, user, navigate])

  if (!initialized || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    )
  }

  const handleSaveKey = () => {
    if (!apiKeyInput.trim()) {
      addToast(t.dashboard.keyInvalid, 'error')
      return
    }
    updateApiKey(apiKeyInput.trim())
    setApiKeyInput('')
    addToast(t.dashboard.keySaved, 'success')
  }

  const existingKey = getApiKey()

  const tierBadge = {
    trial: 'info' as const,
    pilot: 'purple' as const,
    pro: 'success' as const,
    enterprise: 'warning' as const,
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-cyan-400" />
            <span className="font-bold text-white">{t.dashboard.title}</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <div className="hidden items-center gap-2 sm:flex">
              <Coins className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-white">
                {user.credits} {t.dashboard.credits}
              </span>
            </div>
            <Badge variant={tierBadge[user.tier]}>{user.tier.toUpperCase()}</Badge>
            <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate('/'))}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PipelineWorkspace onNeedCredits={() => setShowTopUp(true)} />
          </div>

          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-cyan-400" />
                <h3 className="font-semibold text-white">{t.dashboard.profile}</h3>
              </div>
              <p className="mt-3 text-sm text-slate-400">{user.email}</p>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2">
                <span className="text-sm text-slate-300">{t.dashboard.credits}</span>
                <span className="font-bold text-amber-400">{user.credits}</span>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-cyan-400" />
                <h3 className="font-semibold text-white">{t.dashboard.byokTitle}</h3>
              </div>
              <p className="mt-2 text-xs text-slate-500">{t.dashboard.byokSub}</p>
              {existingKey && (
                <p className="mt-3 font-mono text-sm text-emerald-400">
                  {maskApiKey(existingKey)}
                </p>
              )}
              <div className="mt-3 space-y-2">
                <Input
                  type="password"
                  placeholder="AQ.your-gemini-api-key"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                />
                <Button variant="secondary" size="sm" className="w-full" onClick={handleSaveKey}>
                  {t.dashboard.saveKey}
                </Button>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-cyan-400" />
                <h3 className="font-semibold text-white">{t.dashboard.billing}</h3>
              </div>
              <div className="mt-4 space-y-2">
                <Button className="w-full" onClick={() => setShowTopUp(true)}>
                  {t.dashboard.topUp}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigate('/pilot')}
                >
                  <Rocket className="h-4 w-4" />
                  {t.dashboard.requestPilot}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <CreditTopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} />
    </div>
  )
}
