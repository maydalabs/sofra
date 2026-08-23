import 'server-only'

export function getServerTimeMilliseconds() {
  return Date.now()
}

export function getMinimumLocalDateTime(daysFromNow: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

export function getMaximumLocalDateTime(daysFromNow: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}
