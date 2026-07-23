export type Locale = 'en' | 'nl'

type DeepString<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends readonly (infer U)[]
      ? U extends string
        ? string[]
        : DeepString<T[K]>
      : T[K] extends object
        ? DeepString<T[K]>
        : T[K]
}

export type TranslationDict = DeepString<typeof import('./locales/en').en>
