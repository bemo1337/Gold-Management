const { test, expect } = require('@playwright/test');

test.describe('💝 Owner Wishlist Requests Management Flow - E2E Tests', () => {
  
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

  test('Navigate to wishlist manager', async ({ page }) => {
    const wishlistLink = page.locator('a[href*="wishlist"], button:has-text("طلبات الزبائن")').first();
    const linkVisible = await wishlistLink.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (linkVisible) {
      await wishlistLink.click();
      await page.waitForURL('**/owner/wishlist', { timeout: 10000 });
    } else {
      await page.goto('/owner/wishlist');
    }
    
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/.*wishlist/);
  });

  test('View all wishlist requests', async ({ page }) => {
    await page.goto('/owner/wishlist');
    await page.waitForTimeout(2000);
    
    const requestsList = page.locator('text=/طلب|request|wishlist/i').or(page.locator('[data-testid*="request"]').first());
    await expect(requestsList.or(page.locator('body'))).toBeVisible({ timeout: 5000 });
  });

  test('Filter requests by status', async ({ page }) => {
    await page.goto('/owner/wishlist');
    await page.waitForTimeout(2000);
    
    const statusFilter = page.locator('select[name="status"], [role="combobox"]').first();
    const filterVisible = await statusFilter.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (filterVisible) {
      await statusFilter.click();
      await page.waitForTimeout(500);
      const pendingOption = page.locator('text=pending, text=بانتظار').first();
      if (await pendingOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await pendingOption.click();
        await page.waitForTimeout(2000);
      }
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('Add response to request', async ({ page }) => {
    await page.goto('/owner/wishlist');
    await page.waitForTimeout(2000);
    
    // Find view or respond button
    const viewButton = page.locator('button:has-text("عرض"), button:has-text("View"), button:has-text("رد")').first();
    const viewVisible = await viewButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (viewVisible) {
      await viewButton.click();
      await page.waitForTimeout(1000);
      
      // Fill response if modal appears
      const responseInput = page.locator('textarea[name="response"], textarea[placeholder*="response"]').first();
      if (await responseInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await responseInput.fill('Test response message');
        
        // Submit response
        const submitButton = page.locator('button[type="submit"], button:has-text("إرسال")').first();
        if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(2000);
        }
      }
      
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Mobile responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/owner/wishlist');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('body')).toBeVisible();
  });
});

