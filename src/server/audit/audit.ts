import 'server-only'

export interface AuditEntry {
  id: string
  actorId: string
  action: string
  entityType: string
  entityId: string
  occurredAt: string
  reason: string | null
  previousState: Record<string, unknown> | null
  newState: Record<string, unknown> | null
}

export function createAuditEntry(
  input: Omit<AuditEntry, 'id' | 'occurredAt'>,
): AuditEntry {
  return {
    ...input,
    id: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
  }
}
