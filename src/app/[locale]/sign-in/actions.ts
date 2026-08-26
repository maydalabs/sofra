'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { auth } from '@/server/auth/auth'

const emailSchema = z.string().trim().email()

export async function requestMagicLinkAction(formData: FormData) {
  const locale = formData.get('locale') === 'tr' ? 'tr' : 'en'

  // A malformed address is a form error, not a crash. Previously this threw and
  // the person landed on the error boundary.
  const parsed = emailSchema.safeParse(formData.get('email'))
  if (!parsed.success) {
    redirect(`/${locale}/sign-in?error=invalid_email`)
  }

  try {
    // Verification lands on the auth endpoint first, which establishes the
    // session and only then forwards to callbackURL.
    await auth.api.signInMagicLink({
      body: { email: parsed.data, callbackURL: `/${locale}/account` },
      headers: await headers(),
    })
  } catch (error) {
    // Better Auth rejects with 429 once the send limit is reached. Say so
    // plainly rather than failing as though the address were wrong.
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status: unknown }).status
        : null
    if (status === 429 || status === 'TOO_MANY_REQUESTS') {
      redirect(`/${locale}/sign-in?error=too_many_requests`)
    }
    throw error
  }

  // The same destination regardless of whether the address is registered, so
  // this form cannot be used to enumerate accounts.
  redirect(`/${locale}/verify-email`)
}
