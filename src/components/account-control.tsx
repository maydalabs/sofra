'use client'

import { useState, useTransition } from 'react'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Link, useRouter } from '@/i18n/navigation'
import { authClient, useSession } from '@/lib/auth-client'

/**
 * The signed-in / signed-out control in the site header.
 *
 * The session is read in the browser so the surrounding page stays statically
 * prerenderable; reading it during render would make every public page dynamic.
 *
 * Sign-out goes through the auth client rather than a server action, because
 * the client holds a session cache: revoking server-side alone leaves the header
 * showing signed-in controls until a hard reload.
 */
export function AccountControl() {
  const common = useTranslations('Common')
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [, startTransition] = useTransition()

  // Reserve the space rather than flashing the wrong control.
  if (isPending) return <div className="h-8 w-20" aria-hidden />

  if (!session?.user) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href="/sign-in">{common('signIn')}</Link>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/account">{common('account')}</Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={isSigningOut}
        onClick={async () => {
          setIsSigningOut(true)
          await authClient.signOut()
          startTransition(() => {
            router.push('/')
            router.refresh()
          })
          setIsSigningOut(false)
        }}
      >
        {common('signOut')}
      </Button>
    </div>
  )
}
