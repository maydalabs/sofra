export const demoJourneyChapterIds = [
  'qualify',
  'publish',
  'welcome',
  'followUp',
] as const

export type DemoJourneyChapterId = (typeof demoJourneyChapterIds)[number]
export type DemoJourneyBoundary = 'public' | 'private' | 'restricted'
export type DemoJourneyPersona = 'traveler' | 'host' | 'operator'

export interface DemoJourneyStep {
  id: string
  chapter: DemoJourneyChapterId
  persona: DemoJourneyPersona
  href: string
  state: string
  boundary: DemoJourneyBoundary
}

export const demoJourneySteps: readonly DemoJourneyStep[] = [
  {
    id: 'application',
    chapter: 'qualify',
    persona: 'operator',
    href: '/admin/host-applications/demo-application',
    state: 'submitted',
    boundary: 'restricted',
  },
  {
    id: 'certification',
    chapter: 'qualify',
    persona: 'host',
    href: '/host/household',
    state: 'certified',
    boundary: 'private',
  },
  {
    id: 'draft',
    chapter: 'publish',
    persona: 'host',
    href: '/host/tables/table-ayse-draft/edit',
    state: 'draft',
    boundary: 'private',
  },
  {
    id: 'moderation',
    chapter: 'publish',
    persona: 'operator',
    href: '/admin/tables/table-ece-can-besiktas',
    state: 'submitted',
    boundary: 'restricted',
  },
  {
    id: 'discovery',
    chapter: 'publish',
    persona: 'traveler',
    href: '/tables/ayse-levent-sunday-table',
    state: 'published',
    boundary: 'public',
  },
  {
    id: 'booking',
    chapter: 'welcome',
    persona: 'traveler',
    href: '/account/bookings/booking-demo-pending',
    state: 'pending minimum',
    boundary: 'private',
  },
  {
    id: 'roster',
    chapter: 'welcome',
    persona: 'host',
    href: '/host/tables/table-mercimek-kadikoy/roster',
    state: 'preparing',
    boundary: 'restricted',
  },
  {
    id: 'confirmed',
    chapter: 'welcome',
    persona: 'traveler',
    href: '/account/bookings/booking-demo-confirmed',
    state: 'confirmed',
    boundary: 'private',
  },
  {
    id: 'feedback',
    chapter: 'followUp',
    persona: 'traveler',
    href: '/account/bookings/booking-demo-completed/review',
    state: 'completed',
    boundary: 'private',
  },
  {
    id: 'incident',
    chapter: 'followUp',
    persona: 'operator',
    href: '/admin/incidents',
    state: 'open',
    boundary: 'restricted',
  },
  {
    id: 'payout',
    chapter: 'followUp',
    persona: 'operator',
    href: '/admin/payouts',
    state: 'held',
    boundary: 'restricted',
  },
  {
    id: 'audit',
    chapter: 'followUp',
    persona: 'operator',
    href: '/admin/audit',
    state: 'recorded',
    boundary: 'restricted',
  },
] as const

export function getDemoJourneyStep(id: string) {
  return demoJourneySteps.find((step) => step.id === id)
}

export function getDemoJourneyChapterSteps(chapter: DemoJourneyChapterId) {
  return demoJourneySteps.filter((step) => step.chapter === chapter)
}
