import { test, expect } from '@playwright/test'

test.describe('XP Engine', () => {
  test('XP calculation returns valid results', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Test XP engine via page context
    const result = await page.evaluate(() => {
      // Import the XP engine module
      return import('/src/lib/xpEngine.ts').then((mod) => {
        // Test awardLeaves with various scenarios
        const r1 = mod.awardLeaves(0, 0, 'focus', 30, 'bronze-1')
        const r2 = mod.awardLeaves(1000, 0, 'focus', 30, 'silver-3')
        const r3 = mod.awardLeaves(5000, 100, 'social', 20, 'gold-1')

        return {
          r1: { leaves: r1.leaves, capped: r1.capped },
          r2: { leaves: r2.leaves, capped: r2.capped },
          r3: { leaves: r3.leaves, capped: r3.capped },
        }
      })
    })

    // Basic XP should give leaves
    expect(result.r1.leaves).toBeGreaterThan(0)
    // Higher rank should give slightly less due to diminishing returns
    expect(result.r2.leaves).toBeGreaterThan(0)
    // Social XP should work
    expect(result.r3.leaves).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Rank System', () => {
  test('rankForTotalXp returns correct ranks', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const result = await page.evaluate(() => {
      return import('/src/lib/ranks.ts').then((mod) => {
        return {
          zero: mod.rankForTotalXp(0),
          low: mod.rankForTotalXp(500),
          mid: mod.rankForTotalXp(5000),
          high: mod.rankForTotalXp(50000),
        }
      })
    })

    expect(result.zero.id).toBeTruthy()
    expect(result.low.id).toBeTruthy()
    expect(result.mid.id).toBeTruthy()
    expect(result.high.id).toBeTruthy()
    // Higher XP should give higher rank
    expect(result.high.tier).toBeGreaterThan(result.low.tier)
  })
})

test.describe('Sanitization', () => {
  test('sanitizeHtml strips dangerous tags', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const result = await page.evaluate(() => {
      return import('/src/lib/sanitize.ts').then((mod) => {
        const dirty = '<p>Safe</p><script>alert("xss")</script><img src="x" onerror="alert(1)">'
        const clean = mod.sanitizeHtml(dirty)
        return { clean, hasScript: clean.includes('<script>'), hasOnError: clean.includes('onerror') }
      })
    })

    expect(result.hasScript).toBe(false)
    expect(result.hasOnError).toBe(false)
    expect(result.clean).toContain('<p>Safe</p>')
  })

  test('escapeHtml escapes all dangerous characters', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const result = await page.evaluate(() => {
      return import('/src/lib/sanitize.ts').then((mod) => {
        const input = '<script>alert("xss")</script>'
        const escaped = mod.escapeHtml(input)
        return { escaped, hasRaw: escaped.includes('<script>') }
      })
    })

    expect(result.hasRaw).toBe(false)
    expect(result.escaped).toContain('&lt;script&gt;')
  })

  test('sanitizeUrl blocks javascript URIs', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const result = await page.evaluate(() => {
      return import('/src/lib/sanitize.ts').then((mod) => {
        return {
          js: mod.sanitizeUrl('javascript:alert(1)'),
          data: mod.sanitizeUrl('data:text/html,<script>alert(1)</script>'),
          safe: mod.sanitizeUrl('https://example.com'),
        }
      })
    })

    expect(result.js).toBe('')
    expect(result.data).toBe('')
    expect(result.safe).toBe('https://example.com')
  })
})
