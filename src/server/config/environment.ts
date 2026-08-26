import 'server-only'

/**
 * Production environment validation.
 *
 * Several settings fail quietly rather than loudly when they are missing, and
 * quiet failures in these particular places are dangerous:
 *
 *   BETTER_AUTH_SECRET  signs session tokens. Absent, sessions are signed with
 *                       an unstable value, so every deploy silently logs
 *                       everyone out -- and the signing key is not under your
 *                       control.
 *   DATABASE_URL        absent, anonymous discovery quietly falls back to
 *                       fictional demo data. Shipping invented households as if
 *                       they were real listings would be worse than an outage.
 *   NEXT_PUBLIC_APP_URL absent, sign-in links are built against localhost and
 *                       every magic link is unusable.
 *
 * Failing at startup is the correct response to all three.
 */

interface EnvironmentProblem {
  variable: string
  detail: string
}

const requiredInProduction: EnvironmentProblem[] = []

function require(variable: string, detail: string) {
  const value = process.env[variable]
  if (!value || !value.trim()) {
    requiredInProduction.push({ variable, detail })
  }
  return value
}

export function validateProductionEnvironment(): EnvironmentProblem[] {
  requiredInProduction.length = 0

  require('DATABASE_URL', 'the application would serve fictional demo data')
  require('BETTER_AUTH_SECRET', 'session tokens would not be signed with a stable key')
  require('NEXT_PUBLIC_APP_URL', 'sign-in links would point at localhost')

  const problems = [...requiredInProduction]

  // The persona mechanism must never be reachable in production, so an explicit
  // attempt to switch it on is treated as a misconfiguration rather than
  // silently ignored.
  if (process.env.SOFRA_DEMO_MODE === 'true') {
    problems.push({
      variable: 'SOFRA_DEMO_MODE',
      detail: 'demo personas are not permitted in production',
    })
  }

  if (process.env.SOFRA_ENABLE_MOCK_PAYMENTS === 'true') {
    problems.push({
      variable: 'SOFRA_ENABLE_MOCK_PAYMENTS',
      detail: 'the mock payment provider is not permitted in production',
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl && !appUrl.startsWith('https://')) {
    problems.push({
      variable: 'NEXT_PUBLIC_APP_URL',
      detail:
        `must be an https URL in production (currently "${appUrl}"). ` +
        'NEXT_PUBLIC_ values are inlined at BUILD time, so setting this only ' +
        'in the runtime environment has no effect -- it must be present when ' +
        '`next build` runs.',
    })
  }

  return problems
}

/**
 * Throws when production is misconfigured. Called once from instrumentation so
 * a bad deploy fails immediately rather than on the first request that needs
 * the missing value.
 */
export function assertProductionEnvironment() {
  if (process.env.NODE_ENV !== 'production') return

  const problems = validateProductionEnvironment()
  if (problems.length === 0) return

  const lines = problems.map((p) => `  - ${p.variable}: ${p.detail}`)
  throw new Error(
    `Refusing to start: the production environment is incomplete.\n${lines.join('\n')}`,
  )
}
