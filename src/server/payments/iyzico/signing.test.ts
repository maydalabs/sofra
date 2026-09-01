import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { signRequest, verifyWebhookSignature } from './signing'

const API_KEY = 'sandbox-api-key'
const SECRET = 'sandbox-secret-key'

describe('IYZWSv2 request signing', () => {
  it('signs randomKey + path + body and carries the parts in the header', () => {
    const path = '/payment/iyzipos/checkoutform/initialize/auth/ecom'
    const body = '{"locale":"tr"}'
    const randomKey = '1234567890abc'

    const headers = signRequest(API_KEY, SECRET, path, body, randomKey)

    const expectedSignature = createHmac('sha256', SECRET)
      .update(randomKey + path + body)
      .digest('hex')
    const decoded = Buffer.from(
      headers.Authorization.replace('IYZWSv2 ', ''),
      'base64',
    ).toString('utf8')

    expect(headers['x-iyzi-rnd']).toBe(randomKey)
    expect(decoded).toBe(
      `apiKey:${API_KEY}&randomKey:${randomKey}&signature:${expectedSignature}`,
    )
  })

  it('generates a fresh random key when none is supplied', () => {
    const a = signRequest(API_KEY, SECRET, '/x', '{}')
    const b = signRequest(API_KEY, SECRET, '/x', '{}')
    expect(a['x-iyzi-rnd']).not.toBe(b['x-iyzi-rnd'])
  })
})

describe('X-IYZ-SIGNATURE-V3 webhook verification', () => {
  const fields = {
    iyziEventType: 'CHECKOUT_FORM_AUTH',
    paymentId: '123456789',
    paymentConversationId: 'booking-uuid',
    status: 'SUCCESS',
  }

  function sign(secret: string) {
    return createHmac('sha256', secret)
      .update(
        secret +
          fields.iyziEventType +
          fields.paymentId +
          fields.paymentConversationId +
          fields.status,
      )
      .digest('hex')
  }

  it('accepts the documented concatenation, case-insensitively on hex', () => {
    expect(verifyWebhookSignature(SECRET, fields, sign(SECRET))).toBe(true)
    expect(
      verifyWebhookSignature(SECRET, fields, sign(SECRET).toUpperCase()),
    ).toBe(true)
  })

  it('rejects a tampered field, a wrong key, and a malformed signature', () => {
    expect(
      verifyWebhookSignature(
        SECRET,
        { ...fields, status: 'FAILURE' },
        sign(SECRET),
      ),
    ).toBe(false)
    expect(verifyWebhookSignature('other-secret', fields, sign(SECRET))).toBe(
      false,
    )
    expect(verifyWebhookSignature(SECRET, fields, 'not-hex')).toBe(false)
    expect(verifyWebhookSignature(SECRET, fields, '')).toBe(false)
  })
})
