import { toNextJsHandler } from 'better-auth/next-js'

import { auth } from '@/server/auth/auth'

/**
 * The auth endpoint. Handles magic-link verification, session reads, and sign
 * out.
 *
 * Previously the sign-in email pointed straight at /account with an
 * unredeemed code and nothing ever exchanged it for a session, so signing in
 * could not complete. Verification now lands here first.
 *
 * Note that the proxy matcher deliberately excludes /api, so these routes are
 * not rewritten by the locale middleware.
 */
export const { GET, POST } = toNextJsHandler(auth)
