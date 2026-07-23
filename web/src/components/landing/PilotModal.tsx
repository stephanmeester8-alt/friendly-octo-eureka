import { useState } from 'react'
import { Rocket } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { useToastStore } from '../../store/useToastStore'
import { useTranslation } from '../../store/useLocaleStore'

interface PilotModalProps {
  open: boolean
  onClose: () => void
}

export function PilotModal({ open, onClose }: PilotModalProps) {
  const { t } = useTranslation()
  const { addToast } = useToastStore()
  const [form, setForm] = useState({ company: '', email: '', industry: '', useCase: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addToast(t.pilot.submitted, 'success')
    onClose()
    setForm({ company: '', email: '', industry: '', useCase: '' })
  }

  return (
    <Modal open={open} onClose={onClose} title={t.pilot.title} size="lg">
      <div className="mb-6 flex items-center gap-3 rounded-md border border-indigo-500/20 bg-indigo-500/5 p-4">
        <Rocket className="h-5 w-5 shrink-0 text-indigo-400" />
        <p className="text-sm text-zinc-400">{t.pilot.includes}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        <Input
          label={t.pilot.industry}
          value={form.industry}
          onChange={(e) => setForm({ ...form, industry: e.target.value })}
          placeholder={t.pilot.industryPlaceholder}
          required
        />
        <div className="space-y-2">
          <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            {t.pilot.useCase}
          </label>
          <textarea
            value={form.useCase}
            onChange={(e) => setForm({ ...form, useCase: e.target.value })}
            rows={4}
            required
            className="w-full rounded-md border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            placeholder={t.pilot.useCasePlaceholder}
          />
        </div>
        <Button type="submit" variant="neon" className="w-full" size="lg">
          {t.pilot.submit}
        </Button>
      </form>
    </Modal>
  )
}
