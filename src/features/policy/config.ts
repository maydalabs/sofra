export type CurrencyCode = 'TRY'

export interface MarketplacePolicy {
  minimumLeadDays: number
  maximumPublishingHorizonDays: number
  bookingCutoffHours: number
  rosterLockHours: number
  sharedTableMinimumTravelers: number
  maximumSharedBookingPartySize: number
  takeRateBasisPoints: number
  currency: CurrencyCode
  newHostActiveTableLimit: number
  newHostWeeklyDinnerLimit: number
}

export const developmentPolicy: Readonly<MarketplacePolicy> = {
  minimumLeadDays: 7,
  maximumPublishingHorizonDays: 35,
  bookingCutoffHours: 36,
  rosterLockHours: 24,
  sharedTableMinimumTravelers: 2,
  maximumSharedBookingPartySize: 2,
  takeRateBasisPoints: 2_500,
  currency: 'TRY',
  newHostActiveTableLimit: 2,
  newHostWeeklyDinnerLimit: 2,
}
