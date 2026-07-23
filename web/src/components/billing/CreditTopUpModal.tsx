import { CreditCard, Lock } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { useAuthStore } from '../../store/useAuthStore'
import { useToastStore } from '../../store/useToastStore'
import { useTranslation } from '../../store/useLocaleStore'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface CreditTopUpModalProps {
  open: boolean
  onClose: () => void
}

const PACK_CONFIG = [
  { id: 'pack-10', key: 'starter' as const, credits: 10, priceEur: 50 },
  { id: 'pack-25', key: 'growth' as const, credits: 25, priceEur: 110, popular: true },
  { id: 'pack-50', key: 'scale' as const, credits: 50, priceEur: 200 },
]

export function CreditTopUpModal({ open, onClose }: CreditTopUpModalProps) {
  const [selectedPack, setSelectedPack] = useState(PACK_CONFIG[0].id)
  const [processing, setProcessing] = useState(false)
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')

  const { addCredits } = useAuthStore()
  const { addToast } = useToastStore()
  const { t } = useTranslation()

  const pack = PACK_CONFIG.find((p) => p.id === selectedPack)!

  const handleCheckout = async () => {
    if (!cardNumber || !expiry || !cvc) {
      addToast(t.billing.fillPayment, 'error')
      return
    }
    setProcessing(true)
    await new Promise((r) => setTimeout(r, 2000))
    addCredits(pack.credits)
    addToast(t.billing.purchased.replace('{{count}}', String(pack.credits)), 'success')
    setProcessing(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t.billing.title} size="lg">
      <p className="mb-6 text-sm text-zinc-400">{t.billing.subtitle}</p>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {PACK_CONFIG.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPack(p.id)}
            className={clsx(
              'rounded-md border p-4 text-left transition-all',
              selectedPack === p.id
                ? 'border-indigo-500/50 bg-indigo-500/10 glow-ring'
                : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700',
            )}
          >
            {p.popular && (
              <span className="font-mono text-[10px] font-semibold uppercase text-emerald-400">{t.billing.popular}</span>
            )}
            <p className="font-semibold text-white">{t.billing.packs[p.key]}</p>
            <p className="font-mono text-2xl font-bold text-white">€{p.priceEur}</p>
            <p className="text-sm text-zinc-500">{p.credits} {t.billing.packs.analyses}</p>
          </button>
        ))}
      </div>

      <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
          <CreditCard className="h-4 w-4" />
          <span>{t.billing.stripe}</span>
          <Lock className="ml-auto h-3 w-3" />
        </div>

        <div className="space-y-3">
          <input
            placeholder={t.billing.cardNumber}
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder={t.billing.expiry}
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="rounded-md border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            />
            <input
              placeholder={t.billing.cvc}
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
              className="rounded-md border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {t.billing.total} <span className="font-mono font-semibold text-white">€{pack.priceEur}</span>
        </p>
        <Button variant="neon" onClick={handleCheckout} disabled={processing}>
          {processing ? t.billing.processing : `${t.billing.pay} €${pack.priceEur}`}
        </Button>
      </div>
    </Modal>
  )
}
