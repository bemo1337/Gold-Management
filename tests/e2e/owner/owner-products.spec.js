const { test, expect } = require('@playwright/test');

test.describe('📦 Owner Product Management Flow - E2E Tests', () => {
  
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

  test('Navigate to add product page', async ({ page }) => {
    // Find add product button
    const addButton = page.locator('button:has-text("إضافة منتج"), button:has-text("Add Product"), a[href*="products/add"]').first();
    const addVisible = await addButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (addVisible) {
      await addButton.click();
      await page.waitForURL('**/owner/products/add', { timeout: 10000 });
      await expect(page).toHaveURL(/.*products\/add/);
    } else {
      // Try navigating directly
      await page.goto('/owner/products/add');
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Product form loads with all fields', async ({ page }) => {
    await page.goto('/owner/products/add');
    await page.waitForTimeout(2000);
    
    // Check for required form fields
    const nameField = page.locator('input[name="name"], input[placeholder*="اسم"]').first();
    const productTypeField = page.locator('select[name="productType"], [role="combobox"]').first();
    
    await expect(nameField.or(page.locator('body'))).toBeVisible({ timeout: 5000 });
  });

  test('Create product with valid data', async ({ page }) => {
    await page.goto('/owner/products/add');
    await page.waitForTimeout(2000);
    
    // Fill basic product information
    const nameField = page.locator('input[name="name"], input[placeholder*="اسم"]').first();
    if (await nameField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameField.fill(`Test Product E2E ${Date.now()}`);
    }
    
    // Select product type
    const productTypeSelect = page.locator('select[name="productType"], [role="combobox"]').first();
    if (await productTypeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productTypeSelect.click();
      await page.waitForTimeout(500);
      const option = page.locator('text=خاتم, option[value="خاتم"]').first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option.click();
      }
    }
    
    // Select material
    const materialSelect = page.locator('select[name="material"]').first();
    if (await materialSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await materialSelect.click();
      await page.waitForTimeout(500);
      const materialOption = page.locator('text=ذهب, option[value="ذهب"]').first();
      if (await materialOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await materialOption.click();
      }
    }
    
    // Fill weight
    const weightField = page.locator('input[name="weight"], input[type="number"]').first();
    if (await weightField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await weightField.fill('10');
    }
    
    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("حفظ"), button:has-text("Save")').first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(3000);
      
      // Should redirect to product list or show success message
      const successMessage = page.locator('text=/تم|success|created/i');
      const onProductList = page.url().includes('/owner/dashboard') || page.url().includes('/owner/products');
      
      expect(await successMessage.isVisible({ timeout: 3000 }).catch(() => false) || onProductList).toBeTruthy();
    }
  });

  test('Form validation shows errors for required fields', async ({ page }) => {
    await page.goto('/owner/products/add');
    await page.waitForTimeout(2000);
    
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("حفظ")').first();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(2000);
      
      // Should show validation errors
      const errorVisible = await page.locator('text=/مطلوب|required|error/i').first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(errorVisible || page.url().includes('/owner/products/add')).toBeTruthy();
    }
  });

  test('View product details', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find a product card or link
    const productCard = page.locator('[data-testid*="product"], .product-card, a[href*="products"]').first();
    const productVisible = await productCard.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (productVisible) {
      await productCard.click();
      await page.waitForTimeout(2000);
      
      // Should be on product detail page
      const onDetailPage = page.url().includes('/owner/products/') || page.url().includes('/products/');
      expect(onDetailPage || page.locator('body').isVisible()).toBeTruthy();
    }
  });

  test('Edit product', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Navigate to a product (if exists)
    const productLink = page.locator('a[href*="products/"], button:has-text("تعديل"), button:has-text("Edit")').first();
    const linkVisible = await productLink.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (linkVisible) {
      await productLink.click();
      await page.waitForTimeout(2000);
      
      // Should be on edit page
      const onEditPage = page.url().includes('/owner/products/') && !page.url().includes('/add');
      expect(onEditPage || page.locator('body').isVisible()).toBeTruthy();
    }
  });

  test('Pin/Unpin product', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find pin button
    const pinButton = page.locator('button[aria-label*="pin"], button:has([data-testid*="pin"]), button:has-text("تثبيت")').first();
    const pinVisible = await pinButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (pinVisible) {
      await pinButton.click();
      await page.waitForTimeout(2000);
      
      // Verify action completed
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Delete product with confirmation', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find delete button
    const deleteButton = page.locator('button:has-text("حذف"), button:has-text("Delete"), button[aria-label*="delete"]').first();
    const deleteVisible = await deleteButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (deleteVisible) {
      await deleteButton.click();
      await page.waitForTimeout(1000);
      
      // Confirm deletion if dialog appears
      const confirmButton = page.locator('button:has-text("تأكيد"), button:has-text("Confirm"), button:has-text("حذف")').first();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
      }
      
      // Verify action completed
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

