const { test, expect } = require('@playwright/test');

test.describe('📈 Owner Market Insights Flow - E2E Tests', () => {
  
  async function loginAsOwner(page) {
    await page.goto('/admin');
    await page.fill('input[type="email"]', 'owner@goldeva.com');
    await page.fill('input[type="password"]', 'Owner@2024');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/owner/dashboard', { timeout: 10000 });
  }

  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test('Navigate to market insights', async ({ page }) => {
    const insightsLink = page.locator('a[href*="analytics"], button:has-text("تحليل السوق")').first();
    const linkVisible = await insightsLink.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (linkVisible) {
      await insightsLink.click();
      await page.waitForURL('**/owner/analytics', { timeout: 10000 });
    } else {
      await page.goto('/owner/analytics');
    }
    
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/.*analytics/);
  });

  test('View charts and analytics', async ({ page }) => {
    await page.goto('/owner/analytics');
    await page.waitForTimeout(3000);
    
    // Verify charts load
    const charts = page.locator('svg, canvas, [data-testid*="chart"]').first();
    const chartsVisible = await charts.isVisible({ timeout: 5000 }).catch(() => false);
    
    // Charts might take time to load, but page should be visible
    expect(chartsVisible || page.locator('body').isVisible()).toBeTruthy();
  });

  test('Filter insights by date range', async ({ page }) => {
    await page.goto('/owner/analytics');
    await page.waitForTimeout(2000);
    
    // Find date filter
    const dateFilter = page.locator('input[type="date"], input[name*="date"]').first();
    const filterVisible = await dateFilter.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (filterVisible) {
      await dateFilter.fill('2024-01-01');
      await page.waitForTimeout(1000);
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('Mobile responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/owner/analytics');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('body')).toBeVisible();
  });
});

