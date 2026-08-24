import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const privateRouteSources = [
  '/:locale(en|tr)/account/:path*',
  '/:locale(en|tr)/admin/:path*',
  '/:locale(en|tr)/partner/:path*',
  '/:locale(en|tr)/demo/:path*',
  '/:locale(en|tr)/sign-in',
  '/:locale(en|tr)/verify-email',
  '/:locale(en|tr)/unavailable',
  '/:locale(en|tr)/host/apply',
  '/:locale(en|tr)/host/dashboard',
  '/:locale(en|tr)/host/tables/:path*',
  '/:locale(en|tr)/host/household/:path*',
  '/:locale(en|tr)/host/address',
  '/:locale(en|tr)/tables/:slug/book',
]

const nextConfig: NextConfig = {
  typedRoutes: false,
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      ...privateRouteSources.map((source) => ({
        source,
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet, noimageindex',
          },
        ],
      })),
    ]
  },
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withNextIntl(nextConfig)
