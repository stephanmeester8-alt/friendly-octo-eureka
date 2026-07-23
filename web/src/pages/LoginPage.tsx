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
    if (error) { addToast(t.auth[error], 'error'); return }
    addToast(t.auth.welcomeBack, 'success')
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="terminal-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="absolute right-4 top-4"><LanguageSwitcher /></div>
      <Card className="relative w-full max-w-md" strong glow>
        <div className="mb-8 flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-400" />
          <span className="font-semibold text-white">SovereignAI</span>
        </div>
        <p className="section-label">{t.auth.signIn}</p>
        <p className="mt-2 text-sm text-zinc-500">{t.auth.signInSub}</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input label={t.auth.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label={t.auth.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" variant="primary" className="w-full" size="lg" disabled={loading}>
            {loading ? t.auth.signingIn : t.auth.signIn}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-500">
          {t.auth.noAccount}{' '}
          <Link to="/signup" className="text-indigo-400 hover:underline">{t.nav.startTrial}</Link>
        </p>
      </Card>
    </div>
  )
}
