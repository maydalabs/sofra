import type { CurrencyCode } from '@/features/policy/config'

export type PaymentStatus =
  'created' | 'authorized' | 'failed' | 'refunded' | 'held'

export interface CreateCheckoutInput {
  bookingId: string
  amountKurus: number
  currency: CurrencyCode
  deterministicOutcome?: 'success' | 'failure'
}

export interface CreateCheckoutResult {
  reference: string
  status: PaymentStatus
  auditId: string
}

export interface RefundPaymentInput {
  reference: string
  amountKurus: number
  reason: string
}

export interface RefundPaymentResult {
  reference: string
  status: 'refunded'
  auditId: string
}

export interface RegisterHostPayeeInput {
  hostId: string
}

export interface RegisterHostPayeeResult {
  payeeReference: string
  status: 'development_only'
}

export interface ReleaseHostPayoutInput {
  payoutId: string
  amountKurus: number
  held: boolean
}

export interface ReleaseHostPayoutResult {
  payoutId: string
  status: 'released' | 'held'
  auditId: string
}

export interface VerifyWebhookInput {
  body: string
  signature: string
}

export interface VerifiedPaymentEvent {
  reference: string
  status: PaymentStatus
}

export interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>
  getPaymentStatus(reference: string): Promise<PaymentStatus>
  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>
  registerHostPayee(
    input: RegisterHostPayeeInput,
  ): Promise<RegisterHostPayeeResult>
  releaseHostPayout(
    input: ReleaseHostPayoutInput,
  ): Promise<ReleaseHostPayoutResult>
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedPaymentEvent>
}
