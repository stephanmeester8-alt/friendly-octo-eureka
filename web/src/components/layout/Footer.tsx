import { Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-cyan-400" />
              <span className="font-bold text-white">SovereignAI Workspace</span>
            </div>
            <p className="mt-3 max-w-md text-sm text-slate-400">
              Private, sovereign AI for enterprises that demand data control, audit-ready
              artifacts, and zero per-seat license fees.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><a href="#features" className="hover:text-cyan-400">Features</a></li>
              <li><a href="#pricing" className="hover:text-cyan-400">Pricing</a></li>
              <li><Link to="/dashboard" className="hover:text-cyan-400">Workspace</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><Link to="/pilot" className="hover:text-cyan-400">Pilot Program</Link></li>
              <li><a href="mailto:sales@sovereignai.io" className="hover:text-cyan-400">Contact Sales</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} SovereignAI Workspace. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
