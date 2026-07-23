import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Rocket, Shield } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher'
import { useToastStore } from '../store/useToastStore'
import { useTranslation } from '../store/useLocaleStore'

export function PilotRequestPage() {
  const [form, setForm] = useState({
    company: '',
    email: '',
    industry: '',
    useCase: '',
  })
  const { addToast } = useToastStore()
  const { t } = useTranslation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addToast(t.pilot.submitted, 'success')
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.pilot.back}
        </Link>

        <Card glow>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20">
              <Rocket className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{t.pilot.title}</h1>
              <p className="text-slate-400">{t.pilot.subtitle}</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
            <div className="flex items-center gap-2 text-sm text-violet-300">
              <Shield className="h-4 w-4" />
              {t.pilot.includes}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              label={t.pilot.company}
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder={t.pilot.companyPlaceholder}
              required
            />
            <Input
              label={t.pilot.email}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t.pilot.emailPlaceholder}
              required
            />
            <Input
              label={t.pilot.industry}
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder={t.pilot.industryPlaceholder}
              required
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">
                {t.pilot.useCase}
              </label>
              <textarea
                value={form.useCase}
                onChange={(e) => setForm({ ...form, useCase: e.target.value })}
                rows={4}
                required
                className="w-full rounded-lg border border-slate-600/80 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                placeholder={t.pilot.useCasePlaceholder}
              />
            </div>
            <Button type="submit" className="w-full" size="lg">
              {t.pilot.submit}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
