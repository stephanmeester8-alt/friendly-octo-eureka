import { Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../store/useLocaleStore'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-400" />
              <span className="font-semibold text-white">SovereignAI</span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-500">{t.footer.tagline}</p>
          </div>
          <div className="md:col-span-3">
            <p className="section-label">{t.footer.product}</p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-500">
              <li><a href="#features" className="hover:text-zinc-300">{t.nav.features}</a></li>
              <li><a href="#pricing" className="hover:text-zinc-300">{t.nav.pricing}</a></li>
              <li><Link to="/dashboard" className="hover:text-zinc-300">{t.footer.workspace}</Link></li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <p className="section-label">{t.footer.company}</p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-500">
              <li><Link to="/pilot" className="hover:text-zinc-300">{t.footer.pilot}</Link></li>
              <li><a href="mailto:sales@sovereignai.io" className="hover:text-zinc-300">{t.footer.contactSales}</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-zinc-800 pt-8 font-mono text-[11px] text-zinc-600">
          © {new Date().getFullYear()} SovereignAI · {t.footer.rights}
        </div>
      </div>
    </footer>
  )
}
