import { test, expect } from '@playwright/test';

test.describe('Student View Mode', () => {
  test('should hide sensitive UI components when activated', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // By default, teacher view is active
    await expect(page.locator('.seq-title', { hasText: 'Pedagogical Toolkit' })).toBeVisible();
    await expect(page.locator('.score-input-group').first()).toBeVisible();
    
    // Click the Eye icon (Student View Toggle) in sidebar footer
    // We target the button specifically holding the eye off/on title logic or simply the second button
    const eyeButton = page.locator('button[title*="Student View"]');
    await eyeButton.click();
    
    // Verify overlays and hidden elements
    await expect(page.locator('.locked-overlay', { hasText: 'Student View Active' })).toBeVisible();
    
    await expect(page.locator('.seq-title', { hasText: 'Pedagogical Toolkit' })).not.toBeVisible();
    await expect(page.locator('.score-input-group').first()).not.toBeVisible();
    
    // Verify textarea is read-only
    const textarea = page.locator('.textarea-gen');
    await expect(textarea).toHaveAttribute('readonly', '');
  });
});
