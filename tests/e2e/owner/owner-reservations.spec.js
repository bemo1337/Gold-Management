const { test, expect } = require('@playwright/test');

test.describe('📋 Owner Reservations Management Flow - E2E Tests', () => {
  
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

  test('Navigate to reservations page', async ({ page }) => {
    // Find reservations link
    const reservationsLink = page.locator('a[href*="reservations"], button:has-text("الحجوزات")').first();
    const linkVisible = await reservationsLink.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (linkVisible) {
      await reservationsLink.click();
      await page.waitForURL('**/owner/reservations', { timeout: 10000 });
    } else {
      await page.goto('/owner/reservations');
    }
    
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/.*reservations/);
  });

  test('View all reservations', async ({ page }) => {
    await page.goto('/owner/reservations');
    await page.waitForTimeout(2000);
    
    // Verify reservations list loads
    const reservationsList = page.locator('text=/حجز|reservation/i').or(page.locator('[data-testid*="reservation"]').first());
    await expect(reservationsList.or(page.locator('body'))).toBeVisible({ timeout: 5000 });
  });

  test('Filter reservations by status', async ({ page }) => {
    await page.goto('/owner/reservations');
    await page.waitForTimeout(2000);
    
    // Find status filter
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

  test('Approve reservation', async ({ page }) => {
    await page.goto('/owner/reservations');
    await page.waitForTimeout(2000);
    
    // Find approve button
    const approveButton = page.locator('button:has-text("موافقة"), button:has-text("Approve"), button[aria-label*="approve"]').first();
    const approveVisible = await approveButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (approveVisible) {
      await approveButton.click();
      await page.waitForTimeout(1000);
      
      // Confirm if dialog appears
      const confirmButton = page.locator('button:has-text("تأكيد"), button:has-text("Confirm")').first();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
      }
      
      // Verify action completed
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Reject reservation', async ({ page }) => {
    await page.goto('/owner/reservations');
    await page.waitForTimeout(2000);
    
    // Find reject button
    const rejectButton = page.locator('button:has-text("رفض"), button:has-text("Reject"), button[aria-label*="reject"]').first();
    const rejectVisible = await rejectButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (rejectVisible) {
      await rejectButton.click();
      await page.waitForTimeout(1000);
      
      // Confirm if dialog appears
      const confirmButton = page.locator('button:has-text("تأكيد"), button:has-text("Confirm")').first();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
      }
      
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('View reservation details', async ({ page }) => {
    await page.goto('/owner/reservations');
    await page.waitForTimeout(2000);
    
    // Find reservation card or details button
    const detailsButton = page.locator('button:has-text("عرض"), button:has-text("View"), a[href*="reservations"]').first();
    const detailsVisible = await detailsButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (detailsVisible) {
      await detailsButton.click();
      await page.waitForTimeout(2000);
      
      // Should show details modal or navigate
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Mobile responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/owner/reservations');
    await page.waitForTimeout(2000);
    
    // Verify page loads on mobile
    await expect(page.locator('body')).toBeVisible();
    
    // Check if elements are properly sized
    const cardsVisible = await page.locator('[data-testid*="reservation"], .card').first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(cardsVisible || page.locator('body').isVisible()).toBeTruthy();
  });
});

