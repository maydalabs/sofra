import 'server-only'

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

/**
 * iyzico's IYZWSv2 request authentication and X-IYZ-SIGNATURE-V3 webhook
 * verification. Both are HMAC-SHA256 over documented concatenations; the
 * exact strings live here and nowhere else so a sandbox discrepancy is a
 * one-file fix.
 */

export interface SignedRequestHeaders {
  Authorization: string
  'x-iyzi-rnd': string
}

/**
 * IYZWSv2: signature = HMAC-SHA256_hex(randomKey + uriPath + requestBody),
 * keyed by the secret; the Authorization header carries
 * base64("apiKey:<k>&randomKey:<r>&signature:<s>").
 */
export function signRequest(
  apiKey: string,
  secretKey: string,
  uriPath: string,
  requestBody: string,
  randomKey: string = `${Date.now()}${randomUUID().slice(0, 8)}`,
): SignedRequestHeaders {
  const signature = createHmac('sha256', secretKey)
    .update(randomKey + uriPath + requestBody)
    .digest('hex')
  const authorization = Buffer.from(
    `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`,
  ).toString('base64')
  return {
    Authorization: `IYZWSv2 ${authorization}`,
    'x-iyzi-rnd': randomKey,
  }
}

export interface WebhookEventFields {
  iyziEventType: string
  paymentId: string
  paymentConversationId: string
  status: string
}

/**
 * X-IYZ-SIGNATURE-V3: HMAC-SHA256_hex over
 * secretKey + iyziEventType + paymentId + paymentConversationId + status.
 * Compared in constant time; a length mismatch is an immediate reject.
 */
export function verifyWebhookSignature(
  secretKey: string,
  fields: WebhookEventFields,
  signature: string,
): boolean {
  const expected = createHmac('sha256', secretKey)
    .update(
      secretKey +
        fields.iyziEventType +
        fields.paymentId +
        fields.paymentConversationId +
        fields.status,
    )
    .digest('hex')
  const received = signature.trim().toLowerCase()
  if (received.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received))
}
