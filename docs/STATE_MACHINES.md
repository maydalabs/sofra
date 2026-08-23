# State machines

Transitions are centralized in server-side services and return typed domain errors for illegal operations.

## Hosted table

```text
draft → submitted → changes_requested → submitted
                  ↘ approved → published → minimum_reached → confirmed
                                            ↘ confirmed (guaranteed table)
confirmed → roster_locked → completed → archived
draft/submitted/changes_requested/approved/published/minimum_reached/confirmed/roster_locked → cancelled
```

- Only drafts or change-requested tables can be edited by hosts.
- Only submitted tables can be approved or sent back for changes.
- Only an operator/administrator can approve; only an approved table can be published.
- A suspended host cannot submit or publish a table.
- Capacity cannot exceed active certification.
- Completed and cancelled tables cannot return to a bookable state.

## Booking

```text
draft → awaiting_payment → payment_authorized → pending_minimum → confirmed
                                           ↘ confirmed (minimum already met)
draft/awaiting_payment/payment_authorized/pending_minimum/confirmed → cancelled
cancelled → refunded
confirmed → completed
payment_authorized/confirmed/completed → disputed
```

- Compatibility must be accepted when a dietary review is required before confirmation.
- Production cannot leave `awaiting_payment` without a real provider result.
- Refund and cancellation are separate recorded outcomes.
- The local cancellation review validates the transition to `cancelled` but does not mutate durable data or infer a refund. Production cancellation remains unavailable until the open cancellation/refund policy is approved and a durable write service exists.

## Payout

A payout can move from pending to held or eligible, and from eligible to released. An open safety incident forces or preserves `held`; release is illegal until the hold reason is cleared by an authorized operator.
