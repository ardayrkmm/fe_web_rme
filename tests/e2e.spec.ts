import { test, expect } from '@playwright/test';

test('App loads successfully and shows expected initial UI', async ({ page }) => {
  await page.goto('/');

  // Check that the page loaded by verifying it doesn't just show a blank white screen
  // Wait for network idle or domcontentloaded
  await page.waitForLoadState('networkidle');
  
  // We don't know the exact UI, but let's check if there's any text or basic structure.
  // Generally, an app will have a body element.
  const body = page.locator('body');
  await expect(body).toBeVisible();

  // If there's an error in rendering, sometimes #root is empty. 
  // Let's check that #root has children.
  const rootContent = await page.locator('#root').innerHTML();
  expect(rootContent.length).toBeGreaterThan(0);
});
