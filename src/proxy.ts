import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'
import { buildContentSecurityPolicy } from '@/server/security/content-security-policy'

const handleLocale = createMiddleware(routing)

// Built once: the policy does not vary per request.
const contentSecurityPolicy = buildContentSecurityPolicy()

/**
 * Locale routing plus per-response security headers.
 *
 * Static headers live in next.config.ts. These two are set here because they
 * belong on every response including locale redirects, and HSTS must not be
 * sent from a local http development server.
 */
export default function proxy(request: NextRequest) {
  const response = handleLocale(request)

  response.headers.set('Content-Security-Policy', contentSecurityPolicy)

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    )
  }

  return response
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
}
