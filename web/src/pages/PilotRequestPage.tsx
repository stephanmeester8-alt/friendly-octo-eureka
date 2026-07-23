import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Rocket, Shield } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useToastStore } from '../store/useToastStore'

export function PilotRequestPage() {
  const [form, setForm] = useState({
    company: '',
    email: '',
    industry: '',
    useCase: '',
  })
  const { addToast } = useToastStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addToast(
      'Pilot request submitted! Our team will contact you within 1 business day.',
      'success',
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <Card glow>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20">
              <Rocket className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Pilot Package Request</h1>
              <p className="text-slate-400">€3.500 one-time · Private workspace + custom use case</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
            <div className="flex items-center gap-2 text-sm text-violet-300">
              <Shield className="h-4 w-4" />
              Includes: workspace setup, 1 custom use case, 2h onboarding, 30-day priority support
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              label="Company Name"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Acme Accounting B.V."
              required
            />
            <Input
              label="Work Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="partner@acme.nl"
              required
            />
            <Input
              label="Industry"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="Accounting / Legal / Engineering"
              required
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">
                Custom Use Case Description
              </label>
              <textarea
                value={form.useCase}
                onChange={(e) => setForm({ ...form, useCase: e.target.value })}
                rows={4}
                required
                className="w-full rounded-lg border border-slate-600/80 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                placeholder="Describe the workflow you want automated with sovereign AI…"
              />
            </div>
            <Button type="submit" className="w-full" size="lg">
              Submit Pilot Request
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
