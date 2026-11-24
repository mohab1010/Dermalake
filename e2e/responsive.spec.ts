import { expect, test, type Page } from '@playwright/test'

// Widths from small phones up to desktop. Pages must never be wider than the
// screen — on iOS that shows up as the whole page shifted sideways.
const WIDTHS = [320, 375, 414, 768, 1024, 1440]
const PAGES = ['/', '/shop', '/cart', '/checkout', '/wishlist', '/admin/login', '/not-a-page']

async function overflow(page: Page) {
  return page.evaluate(() => {
    // body clips overflow as a safety net; switch it off so real overflow is measured
    document.body.style.overflowX = 'visible'
    const width = document.documentElement.clientWidth
    const extra = document.documentElement.scrollWidth - width
    const culprits: string[] = []
    if (extra > 1) {
      for (const el of document.querySelectorAll<HTMLElement>('body *')) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && (r.right > width + 1 || r.left < -1)) {
          culprits.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`)
          if (culprits.length >= 5) break
        }
      }
    }
    document.body.style.overflowX = ''
    return { extra, culprits }
  })
}

async function fillCart(page: Page) {
  await page.goto('/shop')
  await page.getByRole('button', { name: /Add to cart|أضف للسلة|اضف|إضافة/ }).first().click()
}

for (const width of WIDTHS) {
  test.describe(`${width}px wide`, () => {
    test.use({ viewport: { width, height: 800 } })

    test('no page is wider than the screen', async ({ page }) => {
      await fillCart(page)
      const productHref = await page.locator('a[href^="/product/"]').first().getAttribute('href')
      for (const path of [...PAGES, productHref!]) {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        // let scroll-in animations (which start a few px off to the side) settle
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 400) {
            window.scrollTo(0, y)
            await new Promise((r) => setTimeout(r, 60))
          }
        })
        await page.waitForTimeout(800)
        const { extra, culprits } = await overflow(page)
        expect(extra, `${path} overflows by ${extra}px: ${culprits.join(' | ')}`).toBeLessThanOrEqual(1)
      }
    })
  })
}
