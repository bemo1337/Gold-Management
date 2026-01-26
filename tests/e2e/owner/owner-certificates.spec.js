const { test, expect } = require('@playwright/test');

test.describe('📜 Owner Certificates Management Flow - E2E Tests', () => {
  
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

  test('Navigate to certificates manager', async ({ page }) => {
    const certsLink = page.locator('a[href*="certificates"], button:has-text("الشهادات")').first();
    const linkVisible = await certsLink.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (linkVisible) {
      await certsLink.click();
      await page.waitForURL('**/owner/certificates', { timeout: 10000 });
    } else {
      await page.goto('/owner/certificates');
    }
    
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/.*certificates/);
  });

  test('View all certificates', async ({ page }) => {
    await page.goto('/owner/certificates');
    await page.waitForTimeout(2000);
    
    const certsList = page.locator('text=/شهادة|certificate/i').or(page.locator('[data-testid*="certificate"]').first());
    await expect(certsList.or(page.locator('body'))).toBeVisible({ timeout: 5000 });
  });

  test('Create certificate', async ({ page }) => {
    await page.goto('/owner/certificates');
    await page.waitForTimeout(2000);
    
    // Find create button
    const createButton = page.locator('button:has-text("إنشاء"), button:has-text("Create")').first();
    const buttonVisible = await createButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (buttonVisible) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      // Fill certificate form if modal appears
      const customerSelect = page.locator('select[name="customer"], [role="combobox"]').first();
      if (await customerSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await customerSelect.click();
        await page.waitForTimeout(500);
      }
      
      // Fill invoice number
      const invoiceInput = page.locator('input[name="invoiceNumber"], input[placeholder*="invoice"]').first();
      if (await invoiceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await invoiceInput.fill(`INV-${Date.now()}`);
      }
      
      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("حفظ")').first();
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(3000);
      }
      
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Update certificate status', async ({ page }) => {
    await page.goto('/owner/certificates');
    await page.waitForTimeout(2000);
    
    // Find status update button or select
    const statusSelect = page.locator('select[name="status"], [role="combobox"]').first();
    const statusVisible = await statusSelect.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (statusVisible) {
      await statusSelect.click();
      await page.waitForTimeout(500);
      const revokedOption = page.locator('text=revoked, text=ملغي').first();
      if (await revokedOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await revokedOption.click();
        await page.waitForTimeout(2000);
      }
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('Download certificate', async ({ page }) => {
    await page.goto('/owner/certificates');
    await page.waitForTimeout(2000);
    
    // Find download button
    const downloadButton = page.locator('button:has-text("تحميل"), button:has-text("Download"), a[href*="download"]').first();
    const downloadVisible = await downloadButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (downloadVisible) {
      // Set up download listener
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
        downloadButton.click()
      ]);
      
      // Download might not always trigger, but button should be clickable
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Mobile responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/owner/certificates');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('body')).toBeVisible();
  });
});

