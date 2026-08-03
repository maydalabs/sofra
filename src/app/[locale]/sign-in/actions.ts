'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createSupabaseServerClient } from '@/server/database/supabase-server'

const emailSchema = z.string().trim().email()

export async function requestMagicLinkAction(formData: FormData) {
  const email = emailSchema.parse(formData.get('email'))
  const locale = formData.get('locale') === 'tr' ? 'tr' : 'en'
  const supabase = await createSupabaseServerClient()

  if (supabase) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${appUrl}/${locale}/account` },
    })
    if (error) throw error
  }

  redirect(`/${locale}/verify-email`)
}
