import 'server-only'

import { toProviderAmount } from '../amounts'
import type { CreateCheckoutInput, RegisterHostPayeeInput } from '../types'

/**
 * Every byte that leaves for the provider is assembled here, field by field,
 * from an explicit allowlist — never by spreading a domain object. The dinner
 * venue, the menu, the neighbourhood, and dietary disclosures are not
 * parameters of any builder in this file, so they cannot leak by refactoring
 * accident; the payload test asserts it from the outside as well.
 */

/**
 * The API requires a buyer identity number. Travellers are never asked for a
 * national ID (frozen product constraint), so the documented placeholder is
 * sent for everyone. Sandbox step 0 (docs/PAYMENT_DECISION.md §7) confirms
 * the provider accepts it.
 */
const BUYER_IDENTITY_PLACEHOLDER = '11111111111'

/**
 * A neutral platform address. We do not collect traveller billing addresses,
 * and the dinner venue must never appear in a payment payload (§7.5), so the
 * platform's own public locality stands in for both address fields.
 */
const NEUTRAL_ADDRESS = 'Sofra platformu'
const NEUTRAL_CITY = 'Istanbul'
const NEUTRAL_COUNTRY = 'Turkey'

export class CheckoutPayloadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CheckoutPayloadError'
  }
}

export function buildCheckoutInitializePayload(input: CreateCheckoutInput) {
  if (!input.hostPayeeReference) {
    throw new CheckoutPayloadError(
      'A marketplace charge needs a registered host payee (subMerchantKey)',
    )
  }
  if (
    !Number.isSafeInteger(input.hostNetPayoutKurus) ||
    input.hostNetPayoutKurus <= 0 ||
    input.hostNetPayoutKurus >= input.amountKurus
  ) {
    // The database enforces guest_total = host_net + fee; re-assert the shape
    // here so a provider payload can never be built from an unbalanced input.
    throw new CheckoutPayloadError(
      'Host net must be a positive integer strictly below the guest total',
    )
  }

  const amount = toProviderAmount(input.amountKurus)
  return {
    locale: 'tr',
    conversationId: input.bookingId,
    price: amount,
    paidPrice: amount,
    currency: input.currency,
    basketId: input.bookingId,
    paymentGroup: 'PRODUCT',
    callbackUrl: input.callbackUrl,
    // Single payment only — mostly foreign-issued cards, no taksit.
    enabledInstallments: [1],
    buyer: {
      id: input.buyer.id,
      name: input.buyer.name,
      surname: input.buyer.surname,
      email: input.buyer.email,
      identityNumber: BUYER_IDENTITY_PLACEHOLDER,
      registrationAddress: NEUTRAL_ADDRESS,
      city: NEUTRAL_CITY,
      country: NEUTRAL_COUNTRY,
      ip: input.buyer.ip,
    },
    billingAddress: {
      contactName: `${input.buyer.name} ${input.buyer.surname}`,
      address: NEUTRAL_ADDRESS,
      city: NEUTRAL_CITY,
      country: NEUTRAL_COUNTRY,
    },
    basketItems: [
      {
        id: input.bookingId,
        // Deliberately says nothing about the dinner: no menu, no
        // neighbourhood, no host. The booking id is the only join key.
        name: `Sofra table seat — booking ${input.bookingId.slice(0, 8)}`,
        category1: 'Dining',
        itemType: 'VIRTUAL',
        price: amount,
        subMerchantKey: input.hostPayeeReference,
        subMerchantPrice: toProviderAmount(input.hostNetPayoutKurus),
      },
    ],
  }
}

export function buildSubMerchantCreatePayload(input: RegisterHostPayeeInput) {
  return {
    locale: 'tr',
    conversationId: input.hostId,
    subMerchantExternalId: input.hostId,
    subMerchantType: 'PERSONAL',
    contactName: input.contactName,
    contactSurname: input.contactSurname,
    email: input.email,
    gsmNumber: input.gsmNumber,
    // KYC about the payee, required for the provider to pay them. This is the
    // one place an address crosses to the provider, and it is the host's own,
    // as the payee — recorded in docs/PAYMENT_DECISION.md §7.5.
    address: input.address,
    identityNumber: input.identityNumber,
    iban: input.iban,
    currency: 'TRY',
  }
}
