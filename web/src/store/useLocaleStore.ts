import { create } from 'zustand'
import type { Locale } from '../i18n/types'
import { translations } from '../i18n'

const STORAGE_KEY = 'sovereignai_locale'

function detectLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
  if (stored === 'en' || stored === 'nl') return stored
  const browser = navigator.language.toLowerCase()
  return browser.startsWith('nl') ? 'nl' : 'en'
}

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: typeof translations.en
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: detectLocale(),
  t: translations[detectLocale()],
  setLocale: (locale) => {
    localStorage.setItem(STORAGE_KEY, locale)
    set({ locale, t: translations[locale] })
    document.documentElement.lang = locale
  },
}))

// Set initial lang attribute
document.documentElement.lang = detectLocale()

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale)
  const t = useLocaleStore((s) => s.t)
  const setLocale = useLocaleStore((s) => s.setLocale)
  return { locale, t, setLocale }
}
