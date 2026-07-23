import { en } from './locales/en'
import { nl } from './locales/nl'
import type { Locale, TranslationDict } from './types'

export const translations: Record<Locale, TranslationDict> = { en, nl }

export type { Locale, TranslationDict } from './types'
