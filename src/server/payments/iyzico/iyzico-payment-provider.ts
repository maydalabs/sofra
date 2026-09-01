import 'server-only'

import { fromProviderAmount, toProviderAmount } from '../amounts'
import type {
  CheckoutStatusResult,
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  PaymentStatus,
  RefundPaymentInput,
  RefundPaymentResult,
  RegisterHostPayeeInput,
  RegisterHostPayeeResult,
  ReleaseHostPayoutInput,
  ReleaseHostPayoutResult,
  RevokeHostPayoutInput,
  RevokeHostPayoutResult,
  UpdateHostShareInput,
  UpdateHostShareResult,
  VerifiedPaymentEvent,
  VerifyWebhookInput,
} from '../types'
import { IYZICO_PATHS, IyzicoApiError, IyzicoClient } from './client'
import type { IyzicoConfig } from './config'
import {
  buildCheckoutInitializePayload,
  buildSubMerchantCreatePayload,
} from './payloads'
import { verifyWebhookSignature } from './signing'

/**
 * Maps iyzico's paymentStatus strings onto the domain vocabulary. Anything
 * unrecognised maps to 'created' — still in flight — rather than to a
 * terminal state, so an unknown provider string can never mark a booking paid
 * or failed on its own.
 */
function toPaymentStatus(value: unknown): PaymentStatus {
  if (value === 'SUCCESS') return 'authorized'
  if (value === 'FAILURE') return 'failed'
  return 'created'
}

/** Amounts may arrive as JSON numbers or strings; both parse exactly or throw. */
function readAmountKurus(value: unknown): number | null {
  if (value === undefined || value === null) return null
  return fromProviderAmount(String(value))
}

function readString(value: unknown): string | null {
  if (typeof value === 'string' && value) return value
  if (typeof value === 'number') return String(value)
  return null
}

export class IyzicoPaymentProvider implements PaymentProvider {
  private readonly client: IyzicoClient

  constructor(
    private readonly config: IyzicoConfig,
    client?: IyzicoClient,
  ) {
    this.client = client ?? new IyzicoClient(config)
  }

  async createCheckout(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    const payload = buildCheckoutInitializePayload(input)
    const response = await this.client.send(
      'POST',
      IYZICO_PATHS.checkoutInitialize,
      payload,
    )
    const token = readString(response.token)
    if (!token) {
      throw new IyzicoApiError(
        IYZICO_PATHS.checkoutInitialize,
        null,
        'checkout initialised without a token',
      )
    }
    return {
      reference: token,
      checkoutUrl: readString(response.paymentPageUrl),
      status: 'created',
      auditId: `iyzico-checkout-${token}`,
    }
  }

  async getCheckoutStatus(reference: string): Promise<CheckoutStatusResult> {
    const response = await this.client.send(
      'POST',
      IYZICO_PATHS.checkoutRetrieve,
      { locale: 'tr', token: reference },
    )
    const items = Array.isArray(response.itemTransactions)
      ? (response.itemTransactions as Record<string, unknown>[])
      : []
    const item = items[0]
    return {
      status: toPaymentStatus(response.paymentStatus),
      providerPaymentId: readString(response.paymentId),
      providerItemReference: item
        ? readString(item.paymentTransactionId)
        : null,
      paidAmountKurus: readAmountKurus(response.paidPrice),
      // What the provider will actually pay the host. The caller compares
      // this to the booking's host_net_payout_kurus and rejects on mismatch.
      hostPayoutAmountKurus: item
        ? readAmountKurus(item.subMerchantPayoutAmount)
        : null,
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    const response = await this.client.send('POST', IYZICO_PATHS.refund, {
      locale: 'tr',
      paymentTransactionId: input.providerItemReference,
      price: toProviderAmount(input.amountKurus),
      currency: 'TRY',
    })
    const reference =
      readString(response.paymentTransactionId) ?? input.providerItemReference
    return {
      reference,
      status: 'refunded',
      auditId: `iyzico-refund-${reference}`,
    }
  }

  async registerHostPayee(
    input: RegisterHostPayeeInput,
  ): Promise<RegisterHostPayeeResult> {
    const response = await this.client.send(
      'POST',
      IYZICO_PATHS.subMerchantCreate,
      buildSubMerchantCreatePayload(input),
    )
    const payeeReference = readString(response.subMerchantKey)
    if (!payeeReference) {
      throw new IyzicoApiError(
        IYZICO_PATHS.subMerchantCreate,
        null,
        'sub-merchant created without a subMerchantKey',
      )
    }
    return { payeeReference, status: 'registered' }
  }

  async releaseHostPayout(
    input: ReleaseHostPayoutInput,
  ): Promise<ReleaseHostPayoutResult> {
    // The database blocks release while an incident is open; this re-check
    // means even a caller that bypassed it cannot reach the provider.
    if (input.held) {
      return {
        payoutId: input.payoutId,
        status: 'held',
        auditId: `iyzico-payout-blocked-${input.payoutId}`,
      }
    }
    await this.client.send('POST', IYZICO_PATHS.itemApprove, {
      locale: 'tr',
      paymentTransactionId: input.providerItemReference,
    })
    return {
      payoutId: input.payoutId,
      status: 'released',
      auditId: `iyzico-payout-${input.providerItemReference}`,
    }
  }

  async revokeHostPayout(
    input: RevokeHostPayoutInput,
  ): Promise<RevokeHostPayoutResult> {
    await this.client.send('POST', IYZICO_PATHS.itemDisapprove, {
      locale: 'tr',
      paymentTransactionId: input.providerItemReference,
    })
    return {
      payoutId: input.payoutId,
      status: 'revoked',
      auditId: `iyzico-payout-revoked-${input.providerItemReference}`,
    }
  }

  async updateHostShare(
    input: UpdateHostShareInput,
  ): Promise<UpdateHostShareResult> {
    await this.client.send('PUT', IYZICO_PATHS.paymentItemUpdate, {
      locale: 'tr',
      paymentTransactionId: input.providerItemReference,
      subMerchantKey: input.payeeReference,
      subMerchantPrice: toProviderAmount(input.hostNetKurus),
    })
    return {
      providerItemReference: input.providerItemReference,
      status: 'updated',
    }
  }

  async verifyWebhook(
    input: VerifyWebhookInput,
  ): Promise<VerifiedPaymentEvent> {
    let event: Record<string, unknown>
    try {
      event = JSON.parse(input.body) as Record<string, unknown>
    } catch {
      throw new Error('Webhook body was not JSON')
    }
    const iyziEventType = readString(event.iyziEventType) ?? ''
    const paymentId = readString(event.paymentId) ?? ''
    const paymentConversationId = readString(event.paymentConversationId) ?? ''
    const status = readString(event.status) ?? ''

    const verified = verifyWebhookSignature(
      this.config.secretKey,
      { iyziEventType, paymentId, paymentConversationId, status },
      input.signature,
    )
    if (!verified) throw new Error('Webhook signature verification failed')
    if (!paymentConversationId || !paymentId) {
      throw new Error('Webhook verified but missing payment identifiers')
    }
    return {
      reference: paymentConversationId,
      providerPaymentId: paymentId,
      eventType: iyziEventType,
      status: toPaymentStatus(status),
    }
  }
}
