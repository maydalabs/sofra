/**
 * Content Security Policy.
 *
 * Sofra holds home addresses and dietary disclosures, so the directives that
 * stop data leaving for somewhere it should not -- connect-src, form-action,
 * base-uri -- carry most of the weight here, along with frame-ancestors, since
 * clickjacking an operator action or a booking is a real risk.
 *
 * script-src permits inline scripts, and that is a deliberate trade rather than
 * an oversight. A nonce must be unique per request, but statically prerendered
 * HTML is fixed at build time, so a nonce policy blocks the App Router's own
 * streaming payload on every prerendered page. The alternative is rendering
 * every page per request. That was not worth it here because:
 *
 *   - the only dangerouslySetInnerHTML in the codebase is server-generated
 *     JSON-LD, and serializeJsonLd escapes '<' so it cannot break out;
 *   - sensitive fields never reach the client at all -- the public projection
 *     excludes them -- so a script injection has nothing local to read;
 *   - connect-src 'self' still prevents exfiltration to an attacker host.
 *
 * To tighten this to a nonce policy later, accept dynamic rendering for every
 * route and reinstate `'nonce-...' 'strict-dynamic'` in place of
 * `'unsafe-inline'`.
 *
 * Optional adapters only widen the policy when they are actually configured, so
 * a deployment without PostHog never permits connections to it.
 */
export function buildContentSecurityPolicy(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const connect = new Set<string>(["'self'"])
  // No 'strict-dynamic': it would make browsers ignore both 'unsafe-inline'
  // and the host allowlist below, which are what this policy relies on.
  const script = new Set<string>(["'self'", "'unsafe-inline'"])
  const img = new Set<string>(["'self'", 'data:', 'blob:'])
  const frame = new Set<string>()

  // React uses eval() in development for debugging features such as
  // reconstructing call stacks, and states plainly that it never does so in
  // production. Allowing it in development keeps the production policy strict
  // while leaving the local error overlay working.
  if (environment.NODE_ENV !== 'production') {
    script.add("'unsafe-eval'")
  }

  if (environment.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    script.add('https://maps.googleapis.com')
    img.add('https://maps.gstatic.com')
    img.add('https://maps.googleapis.com')
    connect.add('https://maps.googleapis.com')
    frame.add('https://www.google.com')
  }

  if (environment.NEXT_PUBLIC_POSTHOG_KEY) {
    const host = environment.NEXT_PUBLIC_POSTHOG_HOST
    if (host) {
      connect.add(host)
      script.add(host)
    }
  }

  if (environment.NEXT_PUBLIC_SENTRY_DSN) {
    try {
      connect.add(new URL(environment.NEXT_PUBLIC_SENTRY_DSN).origin)
    } catch {
      // A malformed DSN should not widen the policy.
    }
  }

  const directives: string[] = [
    `default-src 'self'`,
    `script-src ${[...script].join(' ')}`,
    // Tailwind and the App Router both emit inline style attributes that cannot
    // practically carry a nonce. Inline styles cannot exfiltrate data the way
    // inline scripts can, so this is a deliberate, bounded exception.
    `style-src 'self' 'unsafe-inline'`,
    `img-src ${[...img].join(' ')}`,
    `font-src 'self' data:`,
    `connect-src ${[...connect].join(' ')}`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    // Sofra is never legitimately embedded, and clickjacking a booking or an
    // operator action is a real risk.
    `frame-ancestors 'none'`,
    frame.size ? `frame-src ${[...frame].join(' ')}` : `frame-src 'none'`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
  ]

  if (environment.NODE_ENV === 'production') {
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}
