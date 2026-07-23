import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher'
import { useAuthStore } from '../store/useAuthStore'
import { useToastStore } from '../store/useToastStore'
import { useTranslation } from '../store/useLocaleStore'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn, loading } = useAuthStore()
  const { addToast } = useToastStore()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await signIn(email, password)
    if (error) {
      addToast(t.auth[error], 'error')
      return
    }
    addToast(t.auth.welcomeBack, 'success')
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-slate-950 to-slate-950" />
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <Card className="relative w-full max-w-md" glow>
        <div className="mb-6 flex items-center gap-2">
          <Shield className="h-8 w-8 text-cyan-400" />
          <span className="text-xl font-bold text-white">SovereignAI</span>
        </div>
        <h1 className="text-2xl font-bold text-white">{t.auth.signIn}</h1>
        <p className="mt-1 text-sm text-slate-400">{t.auth.signInSub}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label={t.auth.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@firm.com"
            required
          />
          <Input
            label={t.auth.password}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.auth.signingIn : t.auth.signIn}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {t.auth.noAccount}{' '}
          <Link to="/signup" className="text-cyan-400 hover:underline">
            {t.nav.startTrial}
          </Link>
        </p>
      </Card>
    </div>
  )
}
