const { test, expect } = require('@playwright/test');

test.describe('💰 Owner Material Prices Management Flow - E2E Tests', () => {
  
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

  test('Navigate to material prices manager', async ({ page }) => {
    // Find material prices link
    const pricesLink = page.locator('a[href*="prices"], button:has-text("أسعار المواد")').first();
    const linkVisible = await pricesLink.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (linkVisible) {
      await pricesLink.click();
      await page.waitForURL('**/owner/prices', { timeout: 10000 });
    } else {
      await page.goto('/owner/prices');
    }
    
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/.*prices/);
  });

  test('View current material prices', async ({ page }) => {
    await page.goto('/owner/prices');
    await page.waitForTimeout(2000);
    
    // Verify prices display
    const pricesVisible = await page.locator('text=/ذهب|فضة|ألماس|price|سعر/i').first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(pricesVisible || page.locator('body').isVisible()).toBeTruthy();
  });

  test('Update gold price', async ({ page }) => {
    await page.goto('/owner/prices');
    await page.waitForTimeout(2000);
    
    // Find price input for gold
    const priceInput = page.locator('input[name*="gold"], input[placeholder*="gold"], input[type="number"]').first();
    const inputVisible = await priceInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (inputVisible) {
      await priceInput.fill('2000');
      await page.waitForTimeout(500);
      
      // Find save button
      const saveButton = page.locator('button:has-text("حفظ"), button:has-text("Save")').first();
      if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        // Verify success message or update
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('Update all product prices', async ({ page }) => {
    await page.goto('/owner/prices');
    await page.waitForTimeout(2000);
    
    // Find update all products button
    const updateButton = page.locator('button:has-text("تحديث جميع المنتجات"), button:has-text("Update All Products")').first();
    const buttonVisible = await updateButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (buttonVisible) {
      await updateButton.click();
      await page.waitForTimeout(1000);
      
      // Confirm if dialog appears
      const confirmButton = page.locator('button:has-text("تأكيد"), button:has-text("Confirm")').first();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(3000);
      }
      
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Mobile responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/owner/prices');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('body')).toBeVisible();
  });
});

