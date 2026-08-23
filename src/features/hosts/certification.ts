import type { HostCertificationRecord } from '@/server/repositories/contracts'

export function isHostCertificationActive(
  certification: HostCertificationRecord | undefined,
  now: Date,
) {
  if (!certification || certification.status !== 'active') return false

  const validFrom = certification.validFrom
    ? new Date(certification.validFrom)
    : null
  const validUntil = certification.validUntil
    ? new Date(certification.validUntil)
    : null

  if (validFrom && Number.isNaN(validFrom.getTime())) return false
  if (validUntil && Number.isNaN(validUntil.getTime())) return false
  if (validFrom && validFrom.getTime() > now.getTime()) return false
  if (validUntil && validUntil.getTime() <= now.getTime()) return false
  return true
}
