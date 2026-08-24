import type { Metadata } from 'next'
import { DM_Sans, Newsreader } from 'next/font/google'

import { getSeoRuntimeConfig, privatePageRobots } from '@/features/seo/config'

import './globals.css'

const sans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})

const editorial = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})

const { appUrl } = getSeoRuntimeConfig()

export const metadata: Metadata = {
  metadataBase: appUrl,
  title: {
    default: 'Sofra — Join a Turkish household table',
    template: '%s · Sofra',
  },
  description:
    'Reserve a seat at a scheduled dinner inside a verified Turkish household, with a host-selected menu, tea, and genuine conversation.',
  applicationName: 'Sofra',
  openGraph: {
    type: 'website',
    title: 'Sofra — Join a Turkish household table',
    description: 'Be welcomed into a Turkish household and join the table.',
    siteName: 'Sofra',
    images: [
      {
        url: '/og.png',
        width: 1734,
        height: 907,
        alt: 'Sofra household dinner table',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sofra — Join a Turkish household table',
    description: 'Be welcomed into a Turkish household and join the table.',
    images: ['/og.png'],
  },
  robots: privatePageRobots,
  referrer: 'strict-origin-when-cross-origin',
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${editorial.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
