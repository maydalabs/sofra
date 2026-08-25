import type { AppLocale } from '@/i18n/routing'

const languageCodes: Readonly<Record<string, string>> = {
  Turkish: 'tr',
  English: 'en',
  German: 'de',
  French: 'fr',
}

export function formatTableLanguages(
  languages: readonly string[],
  locale: AppLocale,
) {
  const displayNames = new Intl.DisplayNames([locale], { type: 'language' })
  return languages.map((language) => {
    const code = languageCodes[language]
    return code ? (displayNames.of(code) ?? language) : language
  })
}
