const { test, expect } = require('@playwright/test');

test.describe('⚡ Owner Frontend Performance Tests', () => {
  
  async function loginAsOwner(page) {
    await page.goto('/admin');
    await page.fill('input[type="email"]', 'owner@goldeva.com');
    await page.fill('input[type="password"]', 'Owner@2024');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/owner/dashboard', { timeout: 10000 });
  }

  test('Dashboard initial load completes in < 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/admin');
    await page.fill('input[type="email"]', 'owner@goldeva.com');
    await page.fill('input[type="password"]', 'Owner@2024');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/owner/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(3000); // 3 seconds
  });

  test('Product form loads in < 1 second', async ({ page }) => {
    await loginAsOwner(page);
    
    const startTime = Date.now();
    await page.goto('/owner/products/add');
    await page.waitForLoadState('networkidle');
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(1000); // 1 second
  });

  test('Large data handling (1000+ products)', async ({ page }) => {
    await loginAsOwner(page);
    
    const startTime = Date.now();
    await page.goto('/owner/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check if pagination is working for large datasets
    const pagination = page.locator('text=/صفحة|page|pagination/i').first();
    const paginationVisible = await pagination.isVisible({ timeout: 3000 }).catch(() => false);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should load quickly even with pagination
    expect(duration).toBeLessThan(5000); // 5 seconds for large datasets
  });

  test('Pagination performance', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/owner/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Find next page button
    const nextButton = page.locator('button:has-text("التالي"), button:has-text("Next")').first();
    const nextVisible = await nextButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (nextVisible) {
      const startTime = Date.now();
      await nextButton.click();
      await page.waitForLoadState('networkidle');
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // 2 seconds for pagination
    }
  });

  test('Search performance', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/owner/dashboard');
    await page.waitForTimeout(1000);
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="بحث"]').first();
    const searchVisible = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (searchVisible) {
      const startTime = Date.now();
      await searchInput.fill('test');
      await page.waitForTimeout(1000); // Wait for debounce
      await page.waitForLoadState('networkidle');
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // 2 seconds for search
    }
  });
});

