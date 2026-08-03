import 'server-only'

export interface MonitoringAdapter {
  captureException(error: unknown, context?: Record<string, unknown>): void
}

export const monitoring: MonitoringAdapter = {
  captureException(error, context) {
    if (!process.env.SENTRY_DSN) return
    void import('@sentry/nextjs').then((sentry) =>
      sentry.captureException(error, { extra: context }),
    )
  },
}
