'use client'

import { createAuthClient } from 'better-auth/react'

/**
 * Browser-side session reader.
 *
 * The header's signed-in state is resolved in the browser rather than on the
 * server on purpose: reading the session during render would make every public
 * page dynamic, and discovery pages need to stay statically cacheable. Nothing
 * sensitive is exposed -- only whether a session exists.
 */
export const authClient = createAuthClient()
export const { useSession } = authClient
