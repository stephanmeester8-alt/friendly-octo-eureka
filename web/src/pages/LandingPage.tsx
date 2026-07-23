import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { Features } from '../components/landing/Features'
import { Hero } from '../components/landing/Hero'
import { Pricing } from '../components/landing/Pricing'
import { SecuritySection } from '../components/landing/SecuritySection'

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <SecuritySection />
        <Pricing />
      </main>
      <Footer />
    </div>
  )
}
