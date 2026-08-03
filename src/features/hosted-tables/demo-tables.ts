import { developmentPolicy } from '@/features/policy/config'
import { calculateGuestPrice } from '@/features/pricing/pricing'

import { calculateScheduleWindows } from './scheduling'
import { toPublicHostedTable } from './public-projection'
import type { HostedTableStatus, PrivateHostedTableRecord } from './types'

type DemoTableSeed = Omit<
  PrivateHostedTableRecord,
  | 'startsAt'
  | 'bookingCutoffAt'
  | 'rosterLockAt'
  | 'guestPriceKurus'
  | 'currency'
  | 'publishedAt'
  | 'cancellationReason'
  | 'publicCoordinate'
  | 'preciseCoordinate'
  | 'exactAddress'
  | 'arrivalInstructions'
> & {
  daysFromNow: number
  hour: number
  minute?: number
  coordinateCluster: 'anatolian' | 'european'
}

const clusterCoordinates = {
  anatolian: { latitude: 40.992, longitude: 29.028 },
  european: { latitude: 41.054, longitude: 29.008 },
} as const

const seedTables: DemoTableSeed[] = [
  {
    id: 'table-mercimek-kadikoy',
    slug: 'ayse-levent-sunday-table',
    householdId: 'household-ayse-levent',
    householdName: 'Ayşe & Levent’s table',
    householdStructure:
      'A couple who have shared this neighborhood for three decades',
    householdStory:
      'Sunday dinner stretches into tea in this home. Ayşe cooks the dishes she learned across two generations; Levent keeps the conversation moving.',
    leadHostId: 'host-ayse',
    leadHostName: 'Ayşe',
    leadHostVerified: true,
    daysFromNow: 10,
    hour: 19,
    timezone: 'Europe/Istanbul',
    neighborhood: 'Moda, Kadıköy',
    coordinateCluster: 'anatolian',
    privateAddressId: 'address-demo-1',
    format: 'shared',
    menuTitle: 'A slow Sunday table',
    menuDescription:
      'Mercimek soup, olive-oil stuffed peppers, slow-cooked beef with rice, seasonal salad, and revani before tea.',
    atmosphere: 'Unhurried, story-filled, and gently lively',
    languages: ['Turkish', 'English'],
    expectedHouseholdParticipants: 'Ayşe and Levent will both join the table.',
    practicalInformation:
      'Shoes are left near the entrance. The home has a calm indoor cat.',
    accessibilityInformation:
      'Third floor with a small lift; one low step at the building entrance.',
    proposedCapacity: 6,
    certifiedCapacity: 6,
    availableSeats: 3,
    minimumGuestCount: 2,
    guaranteedOperation: false,
    hostNetPayoutKurus: 120_000,
    status: 'minimum_reached',
    joiningPartySummaries: [
      'A couple visiting from Spain',
      'One solo traveler from Canada',
    ],
  },
  {
    id: 'table-nermin-selma-uskudar',
    slug: 'nermin-selma-seasonal-supper',
    householdId: 'household-nermin-selma',
    householdName: 'Nermin & Selma’s table',
    householdStructure: 'A mother and adult daughter who cook together',
    householdStory:
      'Nermin sets the menu by what looks best at the market. Selma brings contemporary Istanbul into a table grounded in family habits.',
    leadHostId: 'host-selma',
    leadHostName: 'Selma',
    leadHostVerified: true,
    daysFromNow: 13,
    hour: 18,
    minute: 30,
    timezone: 'Europe/Istanbul',
    neighborhood: 'Kuzguncuk, Üsküdar',
    coordinateCluster: 'anatolian',
    privateAddressId: 'address-demo-2',
    format: 'shared',
    menuTitle: 'Market vegetables and family recipes',
    menuDescription:
      'Yayla soup, mücver, olive-oil green beans, chicken with bulgur, cacık, and quince dessert with Turkish coffee.',
    atmosphere: 'Warm, curious, and easy to join',
    languages: ['Turkish', 'English', 'German'],
    expectedHouseholdParticipants: 'Nermin and Selma will host together.',
    practicalInformation: 'A quiet home with no pets; slippers are offered.',
    accessibilityInformation:
      'Ground-floor apartment with a five-centimeter threshold.',
    proposedCapacity: 5,
    certifiedCapacity: 5,
    availableSeats: 5,
    minimumGuestCount: 2,
    guaranteedOperation: false,
    hostNetPayoutKurus: 110_000,
    status: 'published',
    joiningPartySummaries: [],
  },
  {
    id: 'table-cem-figen-besiktas',
    slug: 'cem-figen-bosphorus-evening',
    householdId: 'household-cem-figen',
    householdName: 'Cem & Figen’s table',
    householdStructure: 'Retired siblings and lifelong Istanbul neighbors',
    householdStory:
      'Cem and Figen have very different memories of the same family stories. Their dinners tend to end with records playing softly and another pot of tea.',
    leadHostId: 'host-figen',
    leadHostName: 'Figen',
    leadHostVerified: true,
    daysFromNow: 16,
    hour: 19,
    minute: 30,
    timezone: 'Europe/Istanbul',
    neighborhood: 'Abbasağa, Beşiktaş',
    coordinateCluster: 'european',
    privateAddressId: 'address-demo-3',
    format: 'private',
    menuTitle: 'An Istanbul neighborhood table at home',
    menuDescription:
      'A full household menu of lentil patties, börek, stuffed eggplant, pilaf, yogurt salad, seasonal fruit, and strong tea.',
    atmosphere: 'Witty, musical, and conversational',
    languages: ['Turkish', 'English', 'French'],
    expectedHouseholdParticipants:
      'Cem and Figen will both sit for dinner and tea.',
    practicalInformation:
      'The private table is reserved for one party of up to four.',
    accessibilityInformation: 'Lift access; bathroom doorway is 72 cm wide.',
    proposedCapacity: 4,
    certifiedCapacity: 4,
    availableSeats: 4,
    minimumGuestCount: 1,
    guaranteedOperation: true,
    hostNetPayoutKurus: 145_000,
    status: 'published',
    joiningPartySummaries: [],
  },
  {
    id: 'table-ozdemir-sisli',
    slug: 'ozdemir-three-generations',
    householdId: 'household-ozdemir',
    householdName: 'The Özdemir household table',
    householdStructure: 'Three generations sharing one lively home',
    householdStory:
      'The menu is planned by grandmother Gül, but everyone has a role. Expect overlapping stories, a generous dinner, and patient explanations of family jokes.',
    leadHostId: 'host-deniz',
    leadHostName: 'Deniz',
    leadHostVerified: true,
    daysFromNow: 20,
    hour: 19,
    timezone: 'Europe/Istanbul',
    neighborhood: 'Teşvikiye, Şişli',
    coordinateCluster: 'european',
    privateAddressId: 'address-demo-4',
    format: 'shared',
    menuTitle: 'Three generations, one table',
    menuDescription:
      'Tarhana soup, vine leaves, İzmir köfte, buttered rice, shepherd’s salad, and sütlaç finished under the grill.',
    atmosphere: 'Lively, multigenerational, and welcoming',
    languages: ['Turkish', 'English'],
    expectedHouseholdParticipants:
      'Gül, Deniz, and Deniz’s adult son plan to join.',
    practicalInformation:
      'The household includes a small dog who stays in another room during dinner.',
    accessibilityInformation: 'Lift access with two steps after the entrance.',
    proposedCapacity: 6,
    certifiedCapacity: 6,
    availableSeats: 2,
    minimumGuestCount: 3,
    guaranteedOperation: false,
    hostNetPayoutKurus: 130_000,
    status: 'confirmed',
    joiningPartySummaries: [
      'Two friends traveling together',
      'A couple on their first visit to Istanbul',
    ],
  },
  {
    id: 'table-kemal-kadikoy',
    slug: 'kemal-neighborhood-classics',
    householdId: 'household-kemal',
    householdName: 'Kemal’s table',
    householdStructure: 'A widowed host joined regularly by his adult nephew',
    householdStory:
      'Kemal cooks neighborhood classics and has a gift for making first-time visitors feel expected. His nephew Arda joins for dessert and coffee.',
    leadHostId: 'host-kemal',
    leadHostName: 'Kemal',
    leadHostVerified: true,
    daysFromNow: 8,
    hour: 20,
    timezone: 'Europe/Istanbul',
    neighborhood: 'Yeldeğirmeni, Kadıköy',
    coordinateCluster: 'anatolian',
    privateAddressId: 'address-demo-5',
    format: 'shared',
    menuTitle: 'Neighborhood classics after dark',
    menuDescription:
      'Ezogelin soup, oven-baked vegetables, kuru fasulye with rice, pickles, semolina helva, and Turkish coffee.',
    atmosphere: 'Calm, reflective, and full of local stories',
    languages: ['Turkish', 'English'],
    expectedHouseholdParticipants:
      'Kemal hosts dinner; his nephew Arda joins for dessert and coffee.',
    practicalInformation: 'No pets. Dinner begins promptly at 20:00.',
    accessibilityInformation: 'Second floor without a lift.',
    proposedCapacity: 4,
    certifiedCapacity: 4,
    availableSeats: 2,
    minimumGuestCount: 2,
    guaranteedOperation: false,
    hostNetPayoutKurus: 105_000,
    status: 'roster_locked',
    joiningPartySummaries: ['Two colleagues visiting from the Netherlands'],
  },
  {
    id: 'table-ece-can-besiktas',
    slug: 'ece-can-new-istanbul-table',
    householdId: 'household-ece-can',
    householdName: 'Ece & Can’s table',
    householdStructure: 'A young couple building their own household rituals',
    householdStory:
      'Ece and Can mix recipes from their two hometowns into the dinner they now call their own. The conversation often wanders toward design, music, and city life.',
    leadHostId: 'host-ece',
    leadHostName: 'Ece',
    leadHostVerified: true,
    daysFromNow: 24,
    hour: 19,
    timezone: 'Europe/Istanbul',
    neighborhood: 'Gayrettepe, Beşiktaş',
    coordinateCluster: 'european',
    privateAddressId: 'address-demo-6',
    format: 'shared',
    menuTitle: 'Two hometowns at one Istanbul table',
    menuDescription:
      'Red lentil soup, çiğ köfte made without meat, tray kebab, fresh herbs, künefe, and long-brewed tea.',
    atmosphere: 'Contemporary, relaxed, and creative',
    languages: ['Turkish', 'English'],
    expectedHouseholdParticipants:
      'Ece and Can host the full evening together.',
    practicalInformation: 'A smoke-free home with no pets.',
    accessibilityInformation: 'Modern building with step-free lift access.',
    proposedCapacity: 4,
    certifiedCapacity: 4,
    availableSeats: 4,
    minimumGuestCount: 2,
    guaranteedOperation: false,
    hostNetPayoutKurus: 125_000,
    status: 'submitted',
    joiningPartySummaries: [],
  },
  {
    id: 'table-nermin-private',
    slug: 'nermin-selma-private-friday',
    householdId: 'household-nermin-selma',
    householdName: 'Nermin & Selma’s table',
    householdStructure: 'A mother and adult daughter who cook together',
    householdStory:
      'A private Friday table shaped around the household’s own seasonal menu.',
    leadHostId: 'host-selma',
    leadHostName: 'Selma',
    leadHostVerified: true,
    daysFromNow: 28,
    hour: 19,
    timezone: 'Europe/Istanbul',
    neighborhood: 'Kuzguncuk, Üsküdar',
    coordinateCluster: 'anatolian',
    privateAddressId: 'address-demo-2',
    format: 'private',
    menuTitle: 'A private Friday family table',
    menuDescription:
      'Wedding soup, olive-oil vegetables, roast chicken, bulgur, salad, fruit, and tea.',
    atmosphere: 'Personal, easygoing, and unrushed',
    languages: ['Turkish', 'English', 'German'],
    expectedHouseholdParticipants: 'Nermin and Selma will host together.',
    practicalInformation: 'Reserved for one party of up to five.',
    accessibilityInformation: 'Ground-floor apartment with a small threshold.',
    proposedCapacity: 5,
    certifiedCapacity: 5,
    availableSeats: 5,
    minimumGuestCount: 1,
    guaranteedOperation: true,
    hostNetPayoutKurus: 135_000,
    status: 'approved',
    joiningPartySummaries: [],
  },
  {
    id: 'table-cem-completed',
    slug: 'cem-figen-spring-table',
    householdId: 'household-cem-figen',
    householdName: 'Cem & Figen’s table',
    householdStructure: 'Retired siblings and lifelong Istanbul neighbors',
    householdStory:
      'A completed spring table kept for account and review demonstrations.',
    leadHostId: 'host-figen',
    leadHostName: 'Figen',
    leadHostVerified: true,
    daysFromNow: -12,
    hour: 19,
    timezone: 'Europe/Istanbul',
    neighborhood: 'Abbasağa, Beşiktaş',
    coordinateCluster: 'european',
    privateAddressId: 'address-demo-3',
    format: 'shared',
    menuTitle: 'A spring table with old records',
    menuDescription:
      'Börek, stuffed vegetables, pilaf, salad, seasonal fruit, and tea.',
    atmosphere: 'Witty, musical, and conversational',
    languages: ['Turkish', 'English', 'French'],
    expectedHouseholdParticipants: 'Cem and Figen hosted together.',
    practicalInformation: 'Completed development fixture.',
    accessibilityInformation: 'Lift access.',
    proposedCapacity: 4,
    certifiedCapacity: 4,
    availableSeats: 0,
    minimumGuestCount: 2,
    guaranteedOperation: false,
    hostNetPayoutKurus: 120_000,
    status: 'completed',
    joiningPartySummaries: ['Two friends from Ireland', 'A couple from Japan'],
  },
  {
    id: 'table-ayse-draft',
    slug: 'ayse-autumn-draft',
    householdId: 'household-ayse-levent',
    householdName: 'Ayşe & Levent’s table',
    householdStructure:
      'A couple who have shared this neighborhood for three decades',
    householdStory:
      'An unpublished draft for host-portal editing demonstrations.',
    leadHostId: 'host-ayse',
    leadHostName: 'Ayşe',
    leadHostVerified: true,
    daysFromNow: 32,
    hour: 19,
    timezone: 'Europe/Istanbul',
    neighborhood: 'Moda, Kadıköy',
    coordinateCluster: 'anatolian',
    privateAddressId: 'address-demo-1',
    format: 'shared',
    menuTitle: 'Early autumn draft table',
    menuDescription: 'A draft menu selected by the household.',
    atmosphere: 'Unhurried and neighborly',
    languages: ['Turkish', 'English'],
    expectedHouseholdParticipants: 'Ayşe and Levent plan to host.',
    practicalInformation: 'Draft practical information.',
    accessibilityInformation: 'Draft accessibility information.',
    proposedCapacity: 6,
    certifiedCapacity: 6,
    availableSeats: 6,
    minimumGuestCount: 2,
    guaranteedOperation: false,
    hostNetPayoutKurus: 125_000,
    status: 'draft',
    joiningPartySummaries: [],
  },
]

function toIsoDate(daysFromNow: number, hour: number, minute = 0) {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  date.setDate(date.getDate() + daysFromNow)
  return date
}

function materializeDemoTable(seed: DemoTableSeed): PrivateHostedTableRecord {
  const startsAt = toIsoDate(seed.daysFromNow, seed.hour, seed.minute)
  const schedule = calculateScheduleWindows(startsAt, developmentPolicy)
  const price = calculateGuestPrice(seed.hostNetPayoutKurus, developmentPolicy)
  const publicCoordinate = clusterCoordinates[seed.coordinateCluster]

  return {
    ...seed,
    startsAt: startsAt.toISOString(),
    bookingCutoffAt: schedule.bookingCutoffAt.toISOString(),
    rosterLockAt: schedule.rosterLockAt.toISOString(),
    guestPriceKurus: price.guestTotalKurus,
    currency: price.currency,
    publishedAt: [
      'published',
      'minimum_reached',
      'confirmed',
      'roster_locked',
      'completed',
    ].includes(seed.status)
      ? new Date(startsAt.getTime() - 12 * 24 * 60 * 60 * 1_000).toISOString()
      : null,
    cancellationReason: null,
    publicCoordinate,
    preciseCoordinate: {
      latitude: publicCoordinate.latitude + 0.00123,
      longitude: publicCoordinate.longitude - 0.00117,
    },
    exactAddress: 'Fictional development address — not a real residence',
    arrivalInstructions:
      'Development-only arrival instructions; never part of a public projection.',
  }
}

export function getPrivateDemoTables() {
  return seedTables.map(materializeDemoTable)
}

const publiclyVisibleStatuses: readonly HostedTableStatus[] = [
  'published',
  'minimum_reached',
  'confirmed',
  'roster_locked',
]

export function getPublicDemoTables() {
  return getPrivateDemoTables()
    .filter((table) => publiclyVisibleStatuses.includes(table.status))
    .map(toPublicHostedTable)
}

export function getPublicDemoTable(slug: string) {
  return getPublicDemoTables().find((table) => table.slug === slug)
}
