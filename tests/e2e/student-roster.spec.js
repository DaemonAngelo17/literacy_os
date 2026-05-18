import { test, expect } from '@playwright/test';

test.describe('Student Roster Isolation', () => {
  test('should completely isolate localStorage states between student IDs', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Set Student A ID and Name
    await page.fill('input[placeholder="Name"]', 'Alice A');
    await page.fill('input[placeholder="ID"]', 'student_a');
    
    // Add data to Student A's workspace
    await page.fill('.textarea-gen', 'Alice reading material');
    
    // Switch to Student B
    await page.fill('input[placeholder="Name"]', 'Bob B');
    await page.fill('input[placeholder="ID"]', 'student_b');
    
    // Bob should NOT have Alice's data
    const materialValue = await page.inputValue('.textarea-gen');
    expect(materialValue).not.toContain('Alice reading material');
    
    // Add Bob's data
    await page.fill('.textarea-gen', 'Bob reading material');
    
    // Switch back to Student A
    await page.fill('input[placeholder="ID"]', 'student_a');
    
    // Alice's data should be perfectly restored
    const restoredValue = await page.inputValue('.textarea-gen');
    expect(restoredValue).toContain('Alice reading material');
  });
});
