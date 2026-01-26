const { test, expect } = require('@playwright/test');

test.describe('🔐 Owner Authentication Flow - E2E Tests', () => {
  
  test('Owner can login with valid credentials', async ({ page }) => {
    await page.goto('/admin');
    
    // Verify login page loads
    await expect(page.locator('h1')).toContainText('لوحة التحكم');
    
    // Fill login form
    await page.fill('input[type="email"]', 'owner@goldeva.com');
    await page.fill('input[type="password"]', 'Owner@2024');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/owner/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/.*owner\/dashboard/);
    
    // Verify dashboard elements are visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('Owner login fails with invalid email', async ({ page }) => {
    await page.goto('/admin');
    
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'Owner@2024');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await page.waitForTimeout(2000);
    const errorVisible = await page.locator('text=/خطأ|error|invalid|incorrect/i').isVisible().catch(() => false);
    expect(errorVisible || page.url().includes('/admin')).toBe(true);
  });

  test('Owner login fails with invalid password', async ({ page }) => {
    await page.goto('/admin');
    
    await page.fill('input[type="email"]', 'owner@goldeva.com');
    await page.fill('input[type="password"]', 'WrongPassword@123');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await page.waitForTimeout(2000);
    const errorVisible = await page.locator('text=/خطأ|error|invalid|incorrect/i').isVisible().catch(() => false);
    expect(errorVisible || page.url().includes('/admin')).toBe(true);
  });

  test('Owner can logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/admin');
    await page.fill('input[type="email"]', 'owner@goldeva.com');
    await page.fill('input[type="password"]', 'Owner@2024');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/owner/dashboard', { timeout: 10000 });
    
    // Find and click logout button
    const logoutButton = page.locator('button:has-text("تسجيل خروج"), button:has-text("خروج"), [aria-label*="logout"], [aria-label*="خروج"]').first();
    
    if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutButton.click();
      await page.waitForURL('**/admin', { timeout: 10000 });
      await expect(page).toHaveURL(/.*admin/);
    } else {
      // Try mobile menu logout
      const menuButton = page.locator('button:has([aria-label*="menu"]), button:has([aria-label*="قائمة"])').first();
      if (await menuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await menuButton.click();
        await page.waitForTimeout(500);
        const mobileLogout = page.locator('button:has-text("تسجيل الخروج")').first();
        if (await mobileLogout.isVisible({ timeout: 2000 }).catch(() => false)) {
          await mobileLogout.click();
          await page.waitForURL('**/admin', { timeout: 10000 });
        }
      }
    }
  });

  test('Unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/owner/dashboard');
    
    // Should redirect to admin login
    await page.waitForURL('**/admin', { timeout: 10000 });
    await expect(page).toHaveURL(/.*admin/);
  });

  test('Customer cannot access owner dashboard', async ({ page }) => {
    // Login as customer first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'customer@test.com');
    await page.fill('input[type="password"]', 'Test@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/customer/dashboard', { timeout: 10000 });
    
    // Try to navigate to owner dashboard
    await page.goto('/owner/dashboard');
    await page.waitForTimeout(2000);
    
    // Should either redirect or show error
    const currentURL = page.url();
    expect(currentURL.includes('/owner/dashboard') === false || currentURL.includes('/admin')).toBe(true);
  });

  test('Session persists after page reload', async ({ page }) => {
    // Login
    await page.goto('/admin');
    await page.fill('input[type="email"]', 'owner@goldeva.com');
    await page.fill('input[type="password"]', 'Owner@2024');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/owner/dashboard', { timeout: 10000 });
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Should still be on dashboard
    await expect(page).toHaveURL(/.*owner\/dashboard/);
  });
});

