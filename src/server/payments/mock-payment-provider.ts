import 'server-only'

import type {
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
  VerifiedPaymentEvent,
  VerifyWebhookInput,
} from './types'

interface MockPaymentRecord {
  reference: string
  bookingId: string
  amountKurus: number
  status: PaymentStatus
  createdAt: string
}

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
      status,
      createdAt: new Date().toISOString(),
    })
    return { reference, status, auditId: `audit-${reference}` }
  }

  async getPaymentStatus(reference: string) {
    const record = this.records.get(reference)
    if (!record) throw new Error('Unknown mock payment reference')
    return record.status
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    const record = this.records.get(input.reference)
    if (!record) throw new Error('Unknown mock payment reference')
    if (input.amountKurus > record.amountKurus)
      throw new Error('Refund exceeds original payment')
    record.status = 'refunded'
    return {
      reference: input.reference,
      status: 'refunded',
      auditId: `audit-refund-${input.reference}`,
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
    return { reference: event.reference, status: event.status }
  }
}

export function getPaymentProvider(): PaymentProvider | null {
  if (process.env.NODE_ENV === 'production') return null
  if (process.env.SOFRA_ENABLE_MOCK_PAYMENTS !== 'true') return null
  return new MockPaymentProvider()
}
