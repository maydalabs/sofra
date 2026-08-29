# Payment provider brief

Context for a research session. Everything here is current as of 2026-08-26 and
describes what is actually built, not what is planned.

## What the product is

A Türkiye-first managed marketplace for scheduled dinners inside verified
private households. A traveller reserves a seat at a specific dinner on a
specific date. The host cooks in their own home and eats with the guests.

Not a restaurant, not a delivery service, not a generic host profile — the
bookable unit is one scheduled dinner.

## The money model, as implemented

Currency is **TRY**. All amounts are integer **kuruş**; there are no floats
anywhere in the money path.

1. The **host names the net amount they want per traveller** (`host_net_payout_kurus`).
2. The platform take rate is applied **on top** to produce the guest price
   (`guest_price_kurus`), using integer ceiling division so the host never loses
   a kuruş to rounding. Current development default is 2500 basis points (25%),
   not final.
3. The traveller sees **one all-inclusive price** before checkout. No line items,
   no service fee revealed separately.
4. `guest_total = host_net_payout + sofra_gross_fee` is enforced as a database
   check constraint. A booking that does not balance cannot be inserted.
5. **Partner commission is paid out of the platform's fee**, never added on top.

Worked example: host wants ₺1,200.00 net per traveller, 25% take rate →
guest pays ₺1,600.00, platform fee ₺400.00.

## Where a payment would sit in the existing flow

The booking lifecycle is already built and durable:

```
traveller books  →  booking row created, seats held atomically,
                    money computed server-side (the client cannot propose it)
                    status: draft   payment_status: not_started
                              ↓
                    [ THE GAP — no payment provider ]
                              ↓
dinner happens   →  booking completed
                              ↓
payout           →  payout_records row, held or released by an operator
```

Booking creation, cancellation (returns seats), host onboarding, operator
approval, publication, reviews, safety reports, and payout hold/release are all
implemented, audited, and tested. Only the payment step is missing.

Relevant existing shapes:

- `bookings`: `guest_total_kurus`, `host_net_payout_kurus`,
  `sofra_gross_fee_kurus`, `partner_commission_kurus`, `take_rate_basis_points`,
  `payment_status` (`not_started | created | authorized | failed | refunded | held`),
  `refund_status`
- `payment_records`: provider code, provider reference, amount, status,
  `is_simulated` flag
- `payout_records`: amount, status (`pending | eligible | held | released`),
  `hold_reason`
- A server-only `PaymentProvider` interface already exists with a deterministic
  mock used in tests. The mock cannot be constructed in production.

**A payout is deliberately not released while a safety incident on that dinner
is open.** This is enforced in the database, not in a screen.

## The timing question that shapes everything

Money is collected from the traveller **before** the dinner. The host is paid
**after** it. So funds sit somewhere for days or weeks between the two.

Who holds them, and under what legal footing, is the central unresolved
question — not which SDK is nicest.

## Constraints that are already decided and should not be relitigated

- Türkiye-first launch. TRY only.
- Integer kuruş, explicit integer rounding.
- One all-inclusive guest price.
- Partner commission comes out of the platform fee.
- No alcohol-related product features.
- Single Next.js application; providers sit behind a server-only adapter
  interface. No client-side payment logic that could be tampered with.
- Sensitive data (home addresses, dietary disclosures) must never reach a
  third party that does not strictly need it.

## Still genuinely open, and coupled to this decision

- ~~Cancellation and refund policy~~ **DECIDED (2026-08-29)** and already
  enforced in the database: 100% refund before the booking cutoff, 50% after,
  0% for a no-show, always 100% when the platform cancels. Host is compensated
  first from the retained half. What remains open is only the _execution_:
  the provider must support full and partial refunds against a charge that may
  be days old. Treat partial-refund support as a hard requirement.
- **Crypto rails:** the owner is interested in Bitcoin as a payment option.
  Verify: is accepting crypto as payment for services consumed in Türkiye
  legal today, given the 2021 TCMB payment-use ban? If any structure is viable
  (foreign PSP settling fiat, foreign travellers only), name it — otherwise
  say plainly it is not a launch option.
- Final take rate.
- Host payout timing and structure.
- Minimum-table guarantee: a shared dinner can fail to reach its minimum guest
  count and be cancelled by the platform. Those travellers must be made whole.
- Whether a traveller is charged at booking or only when the dinner is confirmed.
- Tax, invoicing, and consumer-protection obligations.

## What "simple" needs to mean

The goal is the smallest honest first launch, not the most capable platform.
A first launch may reasonably accept manual operational work in exchange for
avoiding a large regulatory or integration burden — the operator tooling for
holds and releases already exists.
