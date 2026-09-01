import { describe, expect, it } from 'vitest'

import type { CreateCheckoutInput } from '../types'
import {
  CheckoutPayloadError,
  buildCheckoutInitializePayload,
  buildSubMerchantCreatePayload,
} from './payloads'

/**
 * A realistic booking as the rest of the system knows it, including exactly
 * the fields that must never reach a payment provider. The builders cannot
 * even receive them — their input types have no such fields — and this test
 * asserts the same thing from the serialised output, so a future widening of
 * the input type cannot quietly start leaking.
 */
const booking = {
  id: '3f2a8c1e-5b7d-4e90-a1b2-c3d4e5f60718',
  guestTotalKurus: 160_000,
  hostNetPayoutKurus: 120_000,
  menuTitle: 'Karadeniz usulü hamsili pilav gecesi',
  neighbourhood: 'Kuzguncuk',
  venueAddressLine: 'İcadiye Caddesi 42, Üsküdar',
  arrivalInstructions: 'Yeşil kapı, ikinci zil',
  dietaryDisclosure: 'severe shellfish allergy, kabuklu deniz ürünleri',
  hostName: 'Fatma Yılmaz',
}

const checkoutInput: CreateCheckoutInput = {
  bookingId: booking.id,
  amountKurus: booking.guestTotalKurus,
  hostNetPayoutKurus: booking.hostNetPayoutKurus,
  hostPayeeReference: 'sub-merchant-key-1',
  currency: 'TRY',
  buyer: {
    id: 'traveler-profile-id',
    name: 'Alex',
    surname: 'Traveller',
    email: 'alex@example.com',
    ip: '203.0.113.7',
  },
  callbackUrl: 'https://sofra.example/api/payments/callback',
}

describe('checkout initialize payload', () => {
  it('contains no venue, menu, host, or dietary data', () => {
    const serialised = JSON.stringify(
      buildCheckoutInitializePayload(checkoutInput),
    )
    for (const forbidden of [
      booking.menuTitle,
      booking.neighbourhood,
      booking.venueAddressLine,
      booking.arrivalInstructions,
      booking.dietaryDisclosure,
      booking.hostName,
      'İcadiye',
      'Kuzguncuk',
      'allergy',
    ]) {
      expect(serialised).not.toContain(forbidden)
    }
  })

  it('charges the full guest total and names the host net as the sub-merchant price', () => {
    const payload = buildCheckoutInitializePayload(checkoutInput)
    expect(payload.price).toBe('1600.00')
    expect(payload.paidPrice).toBe('1600.00')
    expect(payload.basketItems).toHaveLength(1)
    expect(payload.basketItems[0]).toMatchObject({
      price: '1600.00',
      subMerchantKey: 'sub-merchant-key-1',
      subMerchantPrice: '1200.00',
      itemType: 'VIRTUAL',
    })
    // The basket line is neutral: booking id only, nothing about the dinner.
    expect(payload.basketItems[0].name).toBe(
      'Sofra table seat — booking 3f2a8c1e',
    )
    expect(payload.conversationId).toBe(booking.id)
  })

  it('uses a neutral platform address for the buyer, never the venue', () => {
    const payload = buildCheckoutInitializePayload(checkoutInput)
    expect(payload.buyer.registrationAddress).toBe('Sofra platformu')
    expect(payload.billingAddress.address).toBe('Sofra platformu')
  })

  it('refuses to build without a payee or with unbalanced money', () => {
    expect(() =>
      buildCheckoutInitializePayload({
        ...checkoutInput,
        hostPayeeReference: null,
      }),
    ).toThrow(CheckoutPayloadError)
    expect(() =>
      buildCheckoutInitializePayload({
        ...checkoutInput,
        hostNetPayoutKurus: checkoutInput.amountKurus,
      }),
    ).toThrow(CheckoutPayloadError)
    expect(() =>
      buildCheckoutInitializePayload({
        ...checkoutInput,
        hostNetPayoutKurus: 0,
      }),
    ).toThrow(CheckoutPayloadError)
  })
})

describe('sub-merchant create payload', () => {
  it('registers a PERSONAL payee keyed by the household id', () => {
    const payload = buildSubMerchantCreatePayload({
      hostId: 'household-1',
      contactName: 'Fatma',
      contactSurname: 'Yılmaz',
      email: 'fatma@example.com',
      gsmNumber: '+905551112233',
      identityNumber: '10000000146',
      iban: 'TR330006100519786457841326',
      address: 'İcadiye Caddesi 42, Üsküdar',
    })
    expect(payload.subMerchantType).toBe('PERSONAL')
    expect(payload.subMerchantExternalId).toBe('household-1')
    expect(payload.identityNumber).toBe('10000000146')
    expect(payload.iban).toBe('TR330006100519786457841326')
  })
})
