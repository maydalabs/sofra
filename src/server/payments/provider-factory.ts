import 'server-only'

import { getIyzicoConfig } from './iyzico/config'
import { IyzicoPaymentProvider } from './iyzico/iyzico-payment-provider'
import { MockPaymentProvider } from './mock-payment-provider'
import type { PaymentProvider } from './types'

/**
 * Selects the payment provider from the environment, most real first:
 *
 *   IYZICO_API_KEY + IYZICO_SECRET_KEY   → the iyzico adapter (sandbox unless
 *                                          IYZICO_BASE_URL says otherwise)
 *   SOFRA_ENABLE_MOCK_PAYMENTS=true      → the in-memory mock, never in
 *                                          production (environment.ts refuses
 *                                          to boot production with it set)
 *   neither                              → null; callers say honestly that a
 *                                          booking is reserved, not paid
 */
export function getPaymentProvider(): PaymentProvider | null {
  const iyzico = getIyzicoConfig()
  if (iyzico) return new IyzicoPaymentProvider(iyzico)

  if (process.env.NODE_ENV === 'production') return null
  if (process.env.SOFRA_ENABLE_MOCK_PAYMENTS !== 'true') return null
  return new MockPaymentProvider()
}
