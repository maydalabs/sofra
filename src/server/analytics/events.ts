export type AnalyticsEvent =
  | { name: 'table_viewed'; tableId: string }
  | { name: 'date_searched'; date: string }
  | { name: 'table_selected'; tableId: string }
  | { name: 'checkout_started'; tableId: string; partySize: number }
  | {
      name: 'booking_simulation_completed'
      bookingId: string
      outcome: 'success' | 'failure'
    }
  | {
      name: 'alternative_table_shown'
      sourceTableId: string
      alternativeTableId: string
    }
  | { name: 'table_submitted'; tableId: string }
  | { name: 'table_approved'; tableId: string }
  | { name: 'minimum_reached'; tableId: string }
  | {
      name: 'feedback_submitted'
      bookingId: string
      feedbackKind: 'public' | 'private'
    }

export interface AnalyticsAdapter {
  capture(event: AnalyticsEvent): void
}

export const noOpAnalytics: AnalyticsAdapter = { capture: () => undefined }
