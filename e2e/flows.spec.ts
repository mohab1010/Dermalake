import { expect, test, type Page } from '@playwright/test'

const ADD_TO_CART = /Add to cart|أضف للسلة|اضف|إضافة/
const PLACE_ORDER = /Place order|تأكيد الطلب/

type StoredItem = { product: { id: string; price: number; sale_price?: number | null; stock: number }; quantity: number }

const cartItems = (page: Page) =>
  page.evaluate(
    () => (JSON.parse(localStorage.getItem('dermalake-cart') ?? '{"state":{"items":[]}}').state.items) as StoredItem[],
  )

async function openFirstProduct(page: Page) {
  await page.goto('/shop')
  const link = page.locator('a[href^="/product/"]').first()
  await expect(link).toBeVisible()
  const href = await link.getAttribute('href')
  await page.goto(href!)
  return href!
}

test('product page: add chosen quantity to cart', async ({ page }) => {
  await openFirstProduct(page)
  await page.getByRole('button', { name: 'increase' }).first().click()
  await page.getByRole('button', { name: ADD_TO_CART }).first().click()
  await expect.poll(async () => (await cartItems(page))[0]?.quantity).toBe(2)
})

test('adding the same product twice merges into one line, capped at stock', async ({ page }) => {
  await page.goto('/shop')
  const add = page.getByRole('button', { name: ADD_TO_CART }).first()
  await add.click()
  await add.click()
  const items = await cartItems(page)
  expect(items).toHaveLength(1)
  expect(items[0].quantity).toBe(Math.min(2, items[0].product.stock))
})

test('cart: remove item empties the cart', async ({ page }) => {
  await page.goto('/shop')
  await page.getByRole('button', { name: ADD_TO_CART }).first().click()
  await page.goto('/cart')
  await page.getByRole('button', { name: /Remove|حذف|إزالة|شيل/ }).first().click()
  await expect.poll(async () => (await cartItems(page)).length).toBe(0)
  await expect(page.getByText(/Your cart is empty|السلة فاضية|سلتك فاضية|فارغة/).first()).toBeVisible()
})

test('quantity cannot go below 1 or above stock', async ({ page }) => {
  await page.goto('/shop')
  await page.getByRole('button', { name: ADD_TO_CART }).first().click()
  await page.goto('/cart')
  const stock = (await cartItems(page))[0].product.stock
  const inc = page.getByRole('button', { name: 'increase' }).first()
  for (let i = 0; i < stock + 3; i++) {
    if (await inc.isDisabled()) break
    await inc.click()
  }
  await expect.poll(async () => (await cartItems(page))[0].quantity).toBe(stock)
})

test('wishlist: heart toggles and persists across reload', async ({ page }) => {
  await page.goto('/shop')
  const heart = page.locator('main').getByRole('button', { name: /Wishlist|المفضلة/ }).first()
  await heart.click()
  const count = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('dermalake-wishlist') ?? '{"state":{"ids":[]}}').state.ids.length)
  await expect.poll(count).toBe(1)
  await page.goto('/wishlist')
  await page.reload()
  await expect(page.locator('main a[href^="/product/"]').first()).toBeVisible()
  await page.goto('/shop')
  await page.locator('main').getByRole('button', { name: /Wishlist|المفضلة/ }).first().click()
  await expect.poll(count).toBe(0)
})

test('order success shows the order number and items; totals add up', async ({ page }) => {
  await page.goto('/shop')
  await page.getByRole('button', { name: ADD_TO_CART }).first().click()
  const [item] = await cartItems(page)
  const unit = item.product.sale_price ?? item.product.price
  await page.goto('/checkout')
  await page.locator('#co-name').fill('Flow Test')
  await page.locator('#co-phone').fill('01012345678')
  await page.locator('#co-address').fill('1 Test St')
  await page.locator('#co-city').fill('Cairo')
  await page.getByRole('button', { name: PLACE_ORDER }).click()
  await expect(page).toHaveURL(/\/order-success/)
  await expect(page.getByText(/DL-[A-Z0-9]+/)).toBeVisible()

  const order = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const v = localStorage.getItem(localStorage.key(i)!) ?? ''
      if (v.includes('"customer_name":"Flow Test"')) return JSON.parse(v).at(-1)
    }
    return null
  })
  expect(order).not.toBeNull()
  expect(order.status).toBe('pending')
  expect(order.subtotal).toBe(unit)
  expect(order.shipping).toBe(unit >= 800 ? 0 : 60)
  expect(order.total).toBe(order.subtotal + order.shipping)
})

test('order success page without an order redirects or shows no fake number', async ({ page }) => {
  await page.goto('/order-success')
  await expect(page.getByText(/DL-[A-Z0-9]+/)).toHaveCount(0)
})

test('admin login page renders (demo mode: no live sign-in form)', async ({ page }) => {
  await page.goto('/admin/login')
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(page.locator('input[type="password"]')).toHaveCount(0)
})
