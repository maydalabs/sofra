import { expect, test } from '@playwright/test'

const publicTablePath = '/en/tables/ayse-levent-sunday-table'

async function choosePersona(
  page: import('@playwright/test').Page,
  label: RegExp,
) {
  await page.goto('/en/demo')
  await page.getByRole('button', { name: label }).click()
  await page.waitForURL((url) => !url.pathname.endsWith('/demo'))
}

test('anonymous traveler browses scheduled tables', async ({ page }) => {
  await page.goto('/en/tables')
  await expect(
    page.getByRole('heading', { name: /find the evening that feels right/i }),
  ).toBeVisible()
  await expect(page.getByText(/upcoming tables/i).first()).toBeVisible()
  await expect(
    page.getByRole('link', { name: /a slow sunday table/i }).first(),
  ).toBeVisible()
})

test('traveler opens a public table detail without private address data', async ({
  page,
}) => {
  await page.goto(publicTablePath)
  await expect(
    page.getByRole('heading', { name: /a slow sunday table/i }),
  ).toBeVisible()
  await expect(page.getByText(/household’s complete menu/i)).toBeVisible()
  await expect(page.locator('body')).not.toContainText(
    'Fictional development address',
  )
  await expect(page.locator('body')).not.toContainText(
    'Development-only arrival instructions',
  )
})

test('traveler reaches the honest payment-disabled state without card fields', async ({
  page,
}) => {
  await page.goto(`${publicTablePath}/book`)
  await page.getByLabel(/primary traveler name/i).fill('Demo Traveler')
  await page.getByLabel('Email').fill('traveler@example.com')
  await page.getByRole('checkbox').nth(0).click()
  await page.getByRole('checkbox').nth(1).click()
  await expect(page.getByRole('checkbox').nth(0)).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(page.getByRole('checkbox').nth(1)).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page
    .getByRole('button', { name: /continue to payment availability/i })
    .click()
  await expect(page.getByText(/payments are not yet enabled/i)).toBeVisible()
  await expect(page.getByText(/no booking has been marked paid/i)).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /pre-payment review/i }),
  ).toBeVisible()
  await expect(page.getByText(/no review required/i)).toBeVisible()
  await expect(page.locator('input[autocomplete="cc-number"]')).toHaveCount(0)
})

test('traveler sees booking progress and safely reviews cancellation', async ({
  page,
}) => {
  await choosePersona(page, /continue as traveler/i)
  await page.goto('/en/account/bookings/booking-demo-pending')
  await expect(
    page.getByRole('heading', { name: /where this reservation stands/i }),
  ).toBeVisible()
  await expect(
    page.getByText(/waiting for its required traveler minimum/i),
  ).toBeVisible()
  await page
    .getByRole('button', { name: /review cancellation request/i })
    .click()
  await expect(
    page.getByText(/did not change durable data or decide a refund/i),
  ).toBeVisible()
  await expect(
    page.getByText(/final cancellation and refund policy/i),
  ).toBeVisible()
  await expect(page.getByText(/pending minimum/i).first()).toBeVisible()
})

test('certified host creates a validated private draft', async ({ page }) => {
  await choosePersona(page, /continue as certified host/i)
  await page.goto('/en/host/tables/new')
  const dinnerDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1_000)
    .toISOString()
    .slice(0, 16)
  await page.getByLabel('Menu title').fill('A Playwright household table')
  await page.getByLabel('Date and start time').fill(dinnerDate)
  await page
    .getByLabel('Complete household-selected menu')
    .fill(
      'Lentil soup, stuffed vegetables, rice, seasonal salad, dessert, and long-brewed tea.',
    )
  await page.getByLabel('Atmosphere').fill('Warm, unhurried, and easy to join')
  await page
    .getByLabel('Expected household participants')
    .fill('Two verified adult hosts join dinner and tea.')
  await page
    .getByLabel('Practical home information')
    .fill('Shoes stay near the entrance and slippers are provided.')
  await page.getByRole('button', { name: /review private draft/i }).click()
  await expect(page.getByRole('status')).toContainText(
    /no durable table was saved/i,
  )
})

test('host application review does not claim a durable certification', async ({
  page,
}) => {
  await choosePersona(page, /continue as traveler/i)
  await page.goto('/en/host/apply')
  await page.getByLabel(/household public name/i).fill('A demo household')
  await page.getByLabel(/approximate neighborhood/i).fill('Kadıköy')
  await page
    .getByLabel(/household story/i)
    .fill(
      'Our Sunday dinner moves slowly from a household-selected meal into tea and conversation.',
    )
  await page
    .getByLabel(/why would you like to host/i)
    .fill(
      'We would like to welcome travelers into the ordinary rhythm of dinner in our home.',
    )
  await page
    .getByLabel(/who will participate/i)
    .fill('Two verified adult hosts will join dinner and tea.')
  await page
    .getByRole('button', { name: /submit application for review/i })
    .click()
  await expect(page.getByText(/local demo validated/i)).toBeVisible()
  await expect(page.getByText(/no durable application/i)).toBeVisible()
})

test('host creation UI enforces seven-day lead and certified capacity', async ({
  page,
}) => {
  await choosePersona(page, /continue as certified host/i)
  await page.goto('/en/host/tables/new')
  const dateInput = page.getByLabel('Date and start time')
  const minimum = await dateInput.getAttribute('min')
  const capacityMaximum = await page
    .getByLabel('Proposed traveler capacity')
    .getAttribute('max')
  expect(minimum).not.toBeNull()
  expect(
    (new Date(minimum!).getTime() - Date.now()) / (24 * 60 * 60 * 1_000),
  ).toBeGreaterThan(6.9)
  expect(capacityMaximum).toBe('6')
})

test('host submits a draft through the domain service', async ({ page }) => {
  await choosePersona(page, /continue as certified host/i)
  await page.goto('/en/host/tables/table-ayse-draft/edit')
  await page.getByRole('button', { name: /submit for sofra approval/i }).click()
  await expect(page.getByText(/local demo validated/i)).toBeVisible()
  await expect(page.getByText(/no durable status changed/i)).toBeVisible()
  await expect(page.getByText(/^draft$/i).first()).toBeVisible()
})

test('operator approves a submitted table through server authorization', async ({
  page,
}) => {
  await choosePersona(page, /continue as operator/i)
  await page.goto('/en/admin/tables/table-ece-can-besiktas')
  await page.getByRole('button', { name: /approve table/i }).click()
  await expect(
    page.getByText(/table approved through the server service/i),
  ).toBeVisible()
  await expect(
    page.getByText(/publication remains a separate operator transition/i),
  ).toBeVisible()
})

test('published listing exposes approximate area but never exact address', async ({
  page,
}) => {
  const response = await page.goto(publicTablePath)
  expect(response?.status()).toBe(200)
  const html = await page.content()
  expect(html).toContain('Moda, Kadıköy')
  expect(html).not.toContain('Fictional development address')
  expect(html).not.toContain('privateAddressId')
  expect(html).not.toContain('preciseCoordinate')
})

test('unauthorized traveler cannot enter admin operations', async ({
  page,
}) => {
  await page.goto('/en/admin')
  await expect(page).toHaveURL(/\/en\/unavailable/)
  await expect(
    page.getByRole('heading', { name: /needs a different account role/i }),
  ).toBeVisible()
})

test('guided journey switches persona and opens the privacy-safe host roster', async ({
  page,
}) => {
  await page.goto('/en/demo/journey')
  await expect(
    page.getByRole('heading', {
      name: /from household application to careful follow-up/i,
    }),
  ).toBeVisible()
  const rosterForm = page.locator('form').filter({
    has: page.locator('input[name="step"][value="roster"]'),
  })
  await rosterForm.getByRole('button', { name: /open this step/i }).click()
  await expect(page).toHaveURL(
    /\/en\/host\/tables\/table-mercimek-kadikoy\/roster/,
  )
  await expect(
    page.getByRole('heading', { name: /joining parties/i }),
  ).toBeVisible()
  await expect(page.getByText(/confirmed party/i)).toBeVisible()
  await expect(page.getByText(/2 travelers/i)).toBeVisible()
  await expect(page.locator('body')).not.toContainText(
    'Development-only arrival instructions',
  )
  await expect(page.locator('body')).not.toContainText(
    'Fictional development address',
  )
})

test('completed dinner keeps public and private feedback visibly separate', async ({
  page,
}) => {
  await choosePersona(page, /continue as traveler/i)
  await page.goto('/en/account/bookings/booking-demo-completed/review')
  await expect(
    page.getByRole('heading', { name: /public experience review/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /private constructive feedback/i }),
  ).toBeVisible()
  await expect(page.getByText(/operations only/i)).toBeVisible()
})

test('post-dinner submissions preserve moderation, privacy, and payout holds', async ({
  page,
}) => {
  await choosePersona(page, /continue as traveler/i)
  await page.goto('/en/account/bookings/booking-demo-completed/review')

  const publicText =
    'Dinner felt personal and unhurried, and the conversation over tea was generous.'
  await page.getByLabel(/short review title/i).fill('A thoughtful evening')
  await page.getByLabel(/^public experience review$/i).fill(publicText)
  await page.getByLabel(/I have excluded exact address details/i).check()
  await page.getByRole('button', { name: /review public submission/i }).click()
  await expect(page.getByText(/nothing was stored or published/i)).toBeVisible()
  await expect(page.locator('body')).not.toContainText(publicText)

  const privateText =
    'A private suggestion about making the arrival handoff clearer next time.'
  await page.getByLabel(/private note to sofra operations/i).fill(privateText)
  await page.getByRole('button', { name: /review private submission/i }).click()
  await expect(page.getByText(/operations-only note/i)).toBeVisible()
  await expect(page.locator('body')).not.toContainText(privateText)

  const confidentialReport =
    'A fictional confidential safety report that must never appear outside restricted operations.'
  await page.getByLabel(/confidential report/i).fill(confidentialReport)
  await page
    .getByRole('button', { name: /review confidential report/i })
    .click()
  await expect(page.getByText(/required payout hold/i)).toBeVisible()
  await expect(page.getByText(/no incident or payout changed/i)).toBeVisible()
  await expect(page.locator('body')).not.toContainText(confidentialReport)
})

test('operator payout hold is linked to the restricted incident workflow', async ({
  page,
}) => {
  await choosePersona(page, /continue as operator/i)
  await page.goto('/en/admin/payouts')
  await expect(
    page.getByRole('heading', { name: /payout controls/i }),
  ).toBeVisible()
  await expect(page.getByText(/safety hold overrides release/i)).toBeVisible()
  await page.getByRole('link', { name: /review incident queue/i }).click()
  await expect(page).toHaveURL(/\/en\/admin\/incidents/)
})

test('partner sees actor-owned referral stages without traveler or commission data', async ({
  page,
}) => {
  await choosePersona(page, /continue as partner/i)
  await page.goto('/en/partner')

  await expect(
    page.getByRole('heading', {
      name: /see referral progress without traveler identities/i,
    }),
  ).toBeVisible()
  await expect(page.getByRole('code')).toHaveText('SOFRA-DEMO')
  await expect(page.getByText(/landing recorded/i).first()).toBeVisible()
  await expect(page.getByText(/booking attributed/i).first()).toBeVisible()
  await expect(page.getByText(/dinner completed/i).first()).toBeVisible()
  await expect(page.getByText(/partner economics/i)).toBeVisible()

  const html = await page.content()
  expect(html).not.toContain('Demo Traveler')
  expect(html).not.toContain('partnerCommissionKurus')
  expect(html).not.toContain('attributedProfileId')
  expect(html).not.toContain('Fictional development address')
})
