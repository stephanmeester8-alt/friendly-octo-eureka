import clsx from 'clsx'
import { useTranslation } from '../../store/useLocaleStore'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useTranslation()

  return (
    <div
      className={clsx('flex items-center rounded-lg border border-slate-700/80 bg-slate-900/60 p-0.5', className)}
      role="group"
      aria-label={t.common.language}
    >
      {(['en', 'nl'] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLocale(lang)}
          className={clsx(
            'rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition-all',
            locale === lang
              ? 'bg-cyan-500/20 text-cyan-300'
              : 'text-slate-400 hover:text-white',
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}
