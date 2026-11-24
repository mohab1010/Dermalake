import { expect, test, type Page } from '@playwright/test'

const ADD_TO_CART = /Add to cart|أضف للسلة|اضف|إضافة/

async function addFirstProduct(page: Page) {
  await page.goto('/shop')
  const add = page.getByRole('button', { name: ADD_TO_CART }).first()
  await expect(add).toBeVisible()
  await add.click()
}

test('home page renders without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto('/')
  await expect(page).toHaveTitle(/Dermalake/)
  await expect(page.locator('main')).toBeVisible()
  expect(errors).toEqual([])
})

test('shop lists products and search narrows them', async ({ page }) => {
  await page.goto('/shop')
  const cards = page.getByRole('button', { name: ADD_TO_CART })
  await expect(cards.first()).toBeVisible()
  const before = await cards.count()
  expect(before).toBeGreaterThan(1)
  // the header search box navigates here with ?q=
  await page.goto('/shop?q=zzzz-no-match')
  await expect(cards).toHaveCount(0)
})

test('cart persists across reload and updates quantity', async ({ page }) => {
  await addFirstProduct(page)
  await page.goto('/cart')
  await page.reload()
  const qty = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('dermalake-cart')!).state.items[0].quantity)
  expect(await qty()).toBe(1)
  await page.getByRole('button', { name: /increase|زيادة|\+/i }).first().click()
  await expect.poll(qty).toBe(2)
})

test('checkout validates the form, then places an order', async ({ page }) => {
  await addFirstProduct(page)
  await page.goto('/checkout')
  const submit = page.getByRole('button', { name: /Place order|تأكيد الطلب/ })
  await submit.click()
  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByText(/This field is required|الحقل ده مطلوب/).first()).toBeVisible()

  await page.locator('#co-name').fill('Test Customer')
  await page.locator('#co-phone').fill('123')
  await page.locator('#co-address').fill('12 Test St')
  await page.locator('#co-city').fill('Cairo')
  await submit.click()
  await expect(page.getByText(/valid mobile|رقم موبايل صحيح/)).toBeVisible()

  await page.locator('#co-phone').fill('01012345678')
  await submit.click()
  await expect(page).toHaveURL(/\/order-success/)
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('dermalake-cart')!).state.items)
  expect(cart).toHaveLength(0)
})

test('checkout with an empty cart does not allow ordering', async ({ page }) => {
  await page.goto('/checkout')
  await expect(page.locator('#co-name')).toHaveCount(0)
})

test('admin routes redirect signed-out visitors to login', async ({ page }) => {
  for (const path of ['/admin', '/admin/orders', '/admin/products']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/admin\/login/)
  }
})

test('unknown routes show the 404 page', async ({ page }) => {
  await page.goto('/this-page-does-not-exist')
  await expect(page.getByText(/404|not found|غير موجود|مش موجودة/i).first()).toBeVisible()
})
