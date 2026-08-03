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
  await expect(page.locator('input[autocomplete="cc-number"]')).toHaveCount(0)
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
  await page.getByRole('button', { name: /validate and save draft/i }).click()
  await expect(page.getByRole('status')).toContainText(
    /remains private until submitted and approved/i,
  )
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
  await expect(page.getByText(/submitted for sofra approval/i)).toBeVisible()
  await expect(page.getByText(/not public and is now read-only/i)).toBeVisible()
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
