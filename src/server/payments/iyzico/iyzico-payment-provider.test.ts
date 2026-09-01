import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import type { CreateCheckoutInput } from '../types'
import { IYZICO_PATHS, IyzicoApiError, IyzicoClient } from './client'
import type { FetchLike } from './client'
import { IyzicoPaymentProvider } from './iyzico-payment-provider'

const config = {
  apiKey: 'sandbox-api-key',
  secretKey: 'sandbox-secret-key',
  baseUrl: 'https://sandbox-api.iyzipay.com',
}

interface RecordedRequest {
  url: string
  method: string
  headers: Record<string, string>
  body: unknown
}

/** A provider whose HTTP layer is a scripted fake; records every request. */
function fakeProvider(responses: Record<string, unknown>): {
  provider: IyzicoPaymentProvider
  requests: RecordedRequest[]
} {
  const requests: RecordedRequest[] = []
  const fetchImpl: FetchLike = async (url, init) => {
    requests.push({
      url,
      method: init.method,
      headers: init.headers,
      body: JSON.parse(init.body),
    })
    const path = url.replace(config.baseUrl, '')
    const canned = responses[path]
    if (!canned) throw new Error(`No canned response for ${path}`)
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(canned),
    }
  }
  const provider = new IyzicoPaymentProvider(
    config,
    new IyzicoClient(config, fetchImpl),
  )
  return { provider, requests }
}

const checkoutInput: CreateCheckoutInput = {
  bookingId: 'booking-1',
  amountKurus: 160_000,
  hostNetPayoutKurus: 120_000,
  hostPayeeReference: 'sub-merchant-key-1',
  currency: 'TRY',
  buyer: {
    id: 'traveler-1',
    name: 'Alex',
    surname: 'Traveller',
    email: 'alex@example.com',
    ip: '203.0.113.7',
  },
  callbackUrl: 'https://sofra.example/api/payments/callback',
}

describe('iyzico payment provider', () => {
  it('initialises a checkout and returns the hosted page handle', async () => {
    const { provider, requests } = fakeProvider({
      [IYZICO_PATHS.checkoutInitialize]: {
        status: 'success',
        token: 'tok-123',
        paymentPageUrl: 'https://sandbox-cpp.iyzipay.com?token=tok-123',
      },
    })
    const result = await provider.createCheckout(checkoutInput)
    expect(result).toMatchObject({
      reference: 'tok-123',
      checkoutUrl: 'https://sandbox-cpp.iyzipay.com?token=tok-123',
      status: 'created',
    })
    expect(requests).toHaveLength(1)
    expect(requests[0].headers.Authorization).toMatch(/^IYZWSv2 /)
    const body = requests[0].body as {
      paidPrice: string
      basketItems: { subMerchantPrice: string }[]
    }
    expect(body.paidPrice).toBe('1600.00')
    expect(body.basketItems[0].subMerchantPrice).toBe('1200.00')
  })

  it('reads a settled checkout back with exact amounts and item reference', async () => {
    const { provider } = fakeProvider({
      [IYZICO_PATHS.checkoutRetrieve]: {
        status: 'success',
        paymentStatus: 'SUCCESS',
        paymentId: 987654,
        paidPrice: '1600.00',
        itemTransactions: [
          {
            paymentTransactionId: 'item-42',
            transactionStatus: 1,
            subMerchantPrice: 1200.0,
            subMerchantPayoutAmount: '1200.00',
          },
        ],
      },
    })
    const status = await provider.getCheckoutStatus('tok-123')
    expect(status).toEqual({
      status: 'authorized',
      providerPaymentId: '987654',
      providerItemReference: 'item-42',
      paidAmountKurus: 160_000,
      hostPayoutAmountKurus: 120_000,
    })
  })

  it('maps a failed payment and leaves unknown statuses non-terminal', async () => {
    const { provider } = fakeProvider({
      [IYZICO_PATHS.checkoutRetrieve]: {
        status: 'success',
        paymentStatus: 'FAILURE',
        paymentId: 1,
      },
    })
    expect((await provider.getCheckoutStatus('t')).status).toBe('failed')

    const { provider: pending } = fakeProvider({
      [IYZICO_PATHS.checkoutRetrieve]: {
        status: 'success',
        paymentStatus: 'INIT_THREEDS',
        paymentId: 1,
      },
    })
    expect((await pending.getCheckoutStatus('t')).status).toBe('created')
  })

  it('surfaces a provider failure envelope as a typed error', async () => {
    const { provider } = fakeProvider({
      [IYZICO_PATHS.checkoutInitialize]: {
        status: 'failure',
        errorCode: '5001',
        errorMessage: 'subMerchantKey not found',
      },
    })
    await expect(provider.createCheckout(checkoutInput)).rejects.toThrow(
      IyzicoApiError,
    )
  })

  it('refunds against the item reference with an exact decimal amount', async () => {
    const { provider, requests } = fakeProvider({
      [IYZICO_PATHS.refund]: {
        status: 'success',
        paymentTransactionId: 'item-42',
      },
    })
    const result = await provider.refundPayment({
      providerItemReference: 'item-42',
      amountKurus: 80_000,
      reason: 'traveller cancelled after cutoff',
    })
    expect(result.status).toBe('refunded')
    expect(requests[0].body).toMatchObject({
      paymentTransactionId: 'item-42',
      price: '800.00',
      currency: 'TRY',
    })
  })

  it('never calls the provider for a held payout, approves otherwise', async () => {
    const { provider, requests } = fakeProvider({
      [IYZICO_PATHS.itemApprove]: { status: 'success' },
    })
    const held = await provider.releaseHostPayout({
      payoutId: 'payout-1',
      providerItemReference: 'item-42',
      amountKurus: 120_000,
      held: true,
    })
    expect(held.status).toBe('held')
    expect(requests).toHaveLength(0)

    const released = await provider.releaseHostPayout({
      payoutId: 'payout-1',
      providerItemReference: 'item-42',
      amountKurus: 120_000,
      held: false,
    })
    expect(released.status).toBe('released')
    expect(requests).toHaveLength(1)
    expect(requests[0].body).toMatchObject({ paymentTransactionId: 'item-42' })
  })

  it('registers a host payee and returns the sub-merchant key', async () => {
    const { provider } = fakeProvider({
      [IYZICO_PATHS.subMerchantCreate]: {
        status: 'success',
        subMerchantKey: 'smk-99',
      },
    })
    const result = await provider.registerHostPayee({
      hostId: 'household-1',
      contactName: 'Fatma',
      contactSurname: 'Yılmaz',
      email: 'fatma@example.com',
      gsmNumber: '+905551112233',
      identityNumber: '10000000146',
      iban: 'TR330006100519786457841326',
      address: 'İcadiye Caddesi 42, Üsküdar',
    })
    expect(result).toEqual({ payeeReference: 'smk-99', status: 'registered' })
  })

  it('verifies a signed webhook and rejects a tampered one', async () => {
    const { provider } = fakeProvider({})
    const event = {
      iyziEventType: 'CHECKOUT_FORM_AUTH',
      paymentId: 987654,
      paymentConversationId: 'booking-1',
      status: 'SUCCESS',
    }
    const signature = createHmac('sha256', config.secretKey)
      .update(
        config.secretKey +
          event.iyziEventType +
          String(event.paymentId) +
          event.paymentConversationId +
          event.status,
      )
      .digest('hex')

    const verified = await provider.verifyWebhook({
      body: JSON.stringify(event),
      signature,
    })
    expect(verified).toEqual({
      reference: 'booking-1',
      providerPaymentId: '987654',
      eventType: 'CHECKOUT_FORM_AUTH',
      status: 'authorized',
    })

    await expect(
      provider.verifyWebhook({
        body: JSON.stringify({ ...event, status: 'FAILURE' }),
        signature,
      }),
    ).rejects.toThrow('signature')
  })
})
