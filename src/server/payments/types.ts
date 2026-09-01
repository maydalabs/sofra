import type { CurrencyCode } from '@/features/policy/config'

/**
 * Provider-facing payment vocabulary, shaped by docs/PAYMENT_DECISION.md §7.
 *
 * The provider charges the full guest total at booking and holds the host's
 * share unapproved (iyzico: itemTransaction.transactionStatus = 1) until the
 * platform approves it after the dinner. Nothing in this interface allows a
 * host's share to move before that approval — that ordering is what preserves
 * the 6502 md. 48/6(d) joint-liability carve-out.
 */
export type PaymentStatus =
  'created' | 'authorized' | 'failed' | 'refunded' | 'held'

/**
 * The cardholder as the provider needs to know them. This is the traveller's
 * own identity going to their own payment processor — never the host, never
 * the venue. The payload builder supplies a neutral platform address; the
 * dinner address must not appear here or anywhere downstream of here.
 */
export interface CheckoutBuyer {
  id: string
  name: string
  surname: string
  email: string
  ip: string
}

export interface CreateCheckoutInput {
  bookingId: string
  /** Full guest total — charged at booking, in one payment. */
  amountKurus: number
  /** The host's named net; becomes subMerchantPrice, paid through untouched. */
  hostNetPayoutKurus: number
  /**
   * The provider's sub-merchant key for the host. Null is tolerated only by
   * the mock; the real adapter refuses it because a marketplace charge cannot
   * exist without a registered payee.
   */
  hostPayeeReference: string | null
  currency: CurrencyCode
  buyer: CheckoutBuyer
  /** Where the hosted payment page returns the traveller afterwards. */
  callbackUrl: string
  /** Mock-only lever for deterministic tests; the real adapter ignores it. */
  deterministicOutcome?: 'success' | 'failure'
}

export interface CreateCheckoutResult {
  /** The provider handle for this payment attempt (checkout token). */
  reference: string
  /** Hosted payment page to send the traveller to; null for the mock. */
  checkoutUrl: string | null
  status: PaymentStatus
  auditId: string
}

/**
 * The settled state of a checkout, read back from the provider after the
 * traveller returns (and again on webhook). `providerItemReference` is the
 * per-item paymentTransactionId — the handle every later approve, disapprove,
 * and refund is scoped to.
 */
export interface CheckoutStatusResult {
  status: PaymentStatus
  providerPaymentId: string | null
  providerItemReference: string | null
  paidAmountKurus: number | null
  /**
   * What the provider will actually pay the host. The caller must reject the
   * payment if this differs from the booking's host_net_payout_kurus: the
   * money model's premise is that the host receives exactly what they named.
   */
  hostPayoutAmountKurus: number | null
}

export interface RefundPaymentInput {
  /** paymentTransactionId — refunds are scoped to one host's leg. */
  providerItemReference: string
  amountKurus: number
  reason: string
}

export interface RefundPaymentResult {
  reference: string
  status: 'refunded'
  auditId: string
}

/**
 * Registers a host as the provider's sub-merchant and legal payee
 * (subMerchantType PERSONAL). Identity number and IBAN are KYC data handed to
 * the provider once and never logged; the address is the payee's own — a
 * conscious, documented exception recorded in docs/PAYMENT_DECISION.md §7.5.
 */
export interface RegisterHostPayeeInput {
  hostId: string
  contactName: string
  contactSurname: string
  email: string
  gsmNumber: string
  identityNumber: string
  iban: string
  address: string
}

export interface RegisterHostPayeeResult {
  /** The provider's subMerchantKey; stored, and required by every checkout. */
  payeeReference: string
  status: 'registered' | 'development_only'
}

export interface ReleaseHostPayoutInput {
  payoutId: string
  providerItemReference: string
  /** The host net this release is expected to pay; asserted, not trusted. */
  amountKurus: number
  /** An open safety hold blocks release; the database enforces it too. */
  held: boolean
}

export interface ReleaseHostPayoutResult {
  payoutId: string
  status: 'released' | 'held'
  auditId: string
}

export interface RevokeHostPayoutInput {
  payoutId: string
  providerItemReference: string
  reason: string
}

export interface RevokeHostPayoutResult {
  payoutId: string
  status: 'revoked'
  auditId: string
}

/**
 * Rewrites the host's share on a still-held item — the mechanism behind the
 * 36h–168h cancellation tier, where the retained half is resplit in the
 * original proportions. Only meaningful before approval; whether the provider
 * permits it at all post-approval is a sandbox step-0 question.
 */
export interface UpdateHostShareInput {
  providerItemReference: string
  payeeReference: string
  hostNetKurus: number
}

export interface UpdateHostShareResult {
  providerItemReference: string
  status: 'updated'
}

export interface VerifyWebhookInput {
  body: string
  signature: string
}

export interface VerifiedPaymentEvent {
  /** Our conversation id — the booking-scoped reference we sent out. */
  reference: string
  providerPaymentId: string
  eventType: string
  status: PaymentStatus
}

export interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>
  getCheckoutStatus(reference: string): Promise<CheckoutStatusResult>
  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>
  registerHostPayee(
    input: RegisterHostPayeeInput,
  ): Promise<RegisterHostPayeeResult>
  releaseHostPayout(
    input: ReleaseHostPayoutInput,
  ): Promise<ReleaseHostPayoutResult>
  revokeHostPayout(
    input: RevokeHostPayoutInput,
  ): Promise<RevokeHostPayoutResult>
  updateHostShare(input: UpdateHostShareInput): Promise<UpdateHostShareResult>
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedPaymentEvent>
}
