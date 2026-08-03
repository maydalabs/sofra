export function appDateLocale(locale: string) {
  return locale === 'tr' ? 'tr-TR' : 'en-GB'
}

export function formatTableDate(startsAt: string, locale: string) {
  return new Intl.DateTimeFormat(appDateLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(startsAt))
}
