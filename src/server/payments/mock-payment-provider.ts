import 'server-only'

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
} from './types'

interface MockPaymentRecord {
  reference: string
  bookingId: string
  amountKurus: number
  hostNetPayoutKurus: number
  status: PaymentStatus
  createdAt: string
}

/**
 * In-memory stand-in for local development. Unlike the real adapter it
 * settles synchronously: createCheckout returns a terminal status directly
 * instead of a hosted payment page, so the demo flow needs no redirect.
 */
export class MockPaymentProvider implements PaymentProvider {
  private readonly records = new Map<string, MockPaymentRecord>()

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MockPaymentProvider cannot be constructed in production')
    }
  }

  async createCheckout(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    if (!Number.isSafeInteger(input.amountKurus) || input.amountKurus <= 0) {
      throw new TypeError('Payment amount must be positive integer kuruş')
    }
    const reference = `mock-${input.bookingId}-${this.records.size + 1}`
    const status: PaymentStatus =
      input.deterministicOutcome === 'failure' ? 'failed' : 'authorized'
    this.records.set(reference, {
      reference,
      bookingId: input.bookingId,
      amountKurus: input.amountKurus,
      hostNetPayoutKurus: input.hostNetPayoutKurus,
      status,
      createdAt: new Date().toISOString(),
    })
    return {
      reference,
      checkoutUrl: null,
      status,
      auditId: `audit-${reference}`,
    }
  }

  async getCheckoutStatus(reference: string): Promise<CheckoutStatusResult> {
    const record = this.records.get(reference)
    if (!record) throw new Error('Unknown mock payment reference')
    return {
      status: record.status,
      providerPaymentId: `mock-payment-${record.bookingId}`,
      providerItemReference: `mock-item-${record.reference}`,
      paidAmountKurus: record.amountKurus,
      hostPayoutAmountKurus: record.hostNetPayoutKurus,
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    const record = [...this.records.values()].find(
      (candidate) =>
        `mock-item-${candidate.reference}` === input.providerItemReference,
    )
    if (!record) throw new Error('Unknown mock payment item reference')
    if (input.amountKurus > record.amountKurus)
      throw new Error('Refund exceeds original payment')
    record.status = 'refunded'
    return {
      reference: input.providerItemReference,
      status: 'refunded',
      auditId: `audit-refund-${input.providerItemReference}`,
    }
  }

  async registerHostPayee(
    input: RegisterHostPayeeInput,
  ): Promise<RegisterHostPayeeResult> {
    return {
      payeeReference: `mock-payee-${input.hostId}`,
      status: 'development_only',
    }
  }

  async releaseHostPayout(
    input: ReleaseHostPayoutInput,
  ): Promise<ReleaseHostPayoutResult> {
    return {
      payoutId: input.payoutId,
      status: input.held ? 'held' : 'released',
      auditId: `audit-payout-${input.payoutId}`,
    }
  }

  async revokeHostPayout(
    input: RevokeHostPayoutInput,
  ): Promise<RevokeHostPayoutResult> {
    return {
      payoutId: input.payoutId,
      status: 'revoked',
      auditId: `audit-payout-revoked-${input.payoutId}`,
    }
  }

  async updateHostShare(
    input: UpdateHostShareInput,
  ): Promise<UpdateHostShareResult> {
    return {
      providerItemReference: input.providerItemReference,
      status: 'updated',
    }
  }

  async verifyWebhook(
    input: VerifyWebhookInput,
  ): Promise<VerifiedPaymentEvent> {
    if (input.signature !== 'mock-valid-signature')
      throw new Error('Invalid mock webhook signature')
    const event = JSON.parse(input.body) as {
      reference?: string
      status?: PaymentStatus
    }
    if (!event.reference || !event.status)
      throw new Error('Malformed mock webhook')
    return {
      reference: event.reference,
      providerPaymentId: `mock-payment-${event.reference}`,
      eventType: 'MOCK',
      status: event.status,
    }
  }
}
