import { test, expect } from '@playwright/test'

test.describe('App loads', () => {
  test('landing page loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Should not have critical JS errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('WebSocket') && !e.includes('ResizeObserver') && !e.includes('401')
    )
    expect(criticalErrors).toEqual([])
  })

  test('favicon loads', async ({ page }) => {
    await page.goto('/')
    const favicon = page.locator('link[rel="icon"]')
    await expect(favicon).toBeAttached()
  })
})

test.describe('Auth screen', () => {
  test('shows login form when not authenticated', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Should show auth-related elements (email input or OAuth buttons)
    const hasLoginForm = await page.locator('input[type="email"], input[placeholder*="email"], button:has-text("Sign")').first().isVisible().catch(() => false)
    const hasOAuth = await page.locator('button:has-text("GitHub"), button:has-text("Google")').first().isVisible().catch(() => false)
    const hasGuest = await page.locator('button:has-text("Guest")').first().isVisible().catch(() => false)

    // At least one auth method should be visible
    expect(hasLoginForm || hasOAuth || hasGuest).toBeTruthy()
  })
})

test.describe('Security headers', () => {
  test('CSP header is present', async ({ request }) => {
    const response = await request.get('/')
    const csp = response.headers()['content-security-policy']
    expect(csp).toBeTruthy()
    expect(csp).toContain("default-src 'self'")
  })

  test('X-Frame-Options header is DENY', async ({ request }) => {
    const response = await request.get('/')
    const xfo = response.headers()['x-frame-options']
    expect(xfo).toBe('DENY')
  })

  test('HSTS header is present', async ({ request }) => {
    const response = await request.get('/')
    const hsts = response.headers()['strict-transport-security']
    expect(hsts).toContain('max-age=')
  })
})
