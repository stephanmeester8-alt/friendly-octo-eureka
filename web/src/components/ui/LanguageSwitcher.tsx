import clsx from 'clsx'
import { useTranslation } from '../../store/useLocaleStore'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useTranslation()

  return (
    <div
      className={clsx(
        'flex items-center rounded-md border border-zinc-800 bg-zinc-900/50 p-0.5',
        className,
      )}
      role="group"
      aria-label={t.common.language}
    >
      {(['en', 'nl'] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLocale(lang)}
          className={clsx(
            'rounded px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider transition-all',
            locale === lang
              ? 'bg-indigo-600/30 text-indigo-300'
              : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}
