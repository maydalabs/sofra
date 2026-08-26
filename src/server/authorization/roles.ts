export const applicationRoles = [
  'traveler',
  'host_applicant',
  'certified_host',
  'partner_user',
  'operator',
  'administrator',
] as const

export type ApplicationRole = (typeof applicationRoles)[number]

export interface Actor {
  id: string
  email: string
  emailVerified: boolean
  roles: readonly ApplicationRole[]
  source: 'database' | 'demo'
}

export class AuthorizationError extends Error {
  readonly code = 'NOT_AUTHORIZED'

  constructor(message = 'You are not authorized to perform this action') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export function assertHasAnyRole(
  actor: Actor,
  allowedRoles: readonly ApplicationRole[],
) {
  if (!actor.roles.some((role) => allowedRoles.includes(role))) {
    throw new AuthorizationError()
  }
}

export function assertVerifiedEmail(actor: Actor) {
  if (!actor.emailVerified) {
    throw new AuthorizationError('A verified email is required for this action')
  }
}
