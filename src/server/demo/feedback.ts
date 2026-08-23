import 'server-only'

export interface DemoCompletedFeedback {
  bookingId: string
  publicReview: {
    rating: number
    title: string
    body: string
    publicationStatus: 'published'
  }
  privateFeedback: {
    body: string
    visibility: 'operations_only'
    status: 'received'
  }
}

const completedFeedback: DemoCompletedFeedback = {
  bookingId: 'booking-demo-completed',
  publicReview: {
    rating: 5,
    title: 'A generous evening with time for stories',
    body: 'Dinner felt personal and unhurried. Tea lasted almost as long as the meal, and both hosts made everyone feel expected.',
    publicationStatus: 'published',
  },
  privateFeedback: {
    body: 'A fictional private note about making the arrival handoff clearer for future guests.',
    visibility: 'operations_only',
    status: 'received',
  },
}

export function getDemoCompletedFeedback(bookingId: string) {
  return bookingId === completedFeedback.bookingId
    ? completedFeedback
    : undefined
}
