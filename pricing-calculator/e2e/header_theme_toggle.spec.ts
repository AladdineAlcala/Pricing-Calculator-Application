import { test, expect } from '@playwright/test';

test.describe('Header Theme Toggle Icon Button Placement & Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__TAURI_INTERNALS__ = {
        invoke: async (cmd: string, args?: any) => {
          if (cmd === 'get_settings') {
            return [
              { setting_key: 'currency_symbol', setting_value: '₱' },
              { setting_key: 'theme', setting_value: 'light' },
            ];
          }
          if (cmd === 'get_recipes') {
            return [];
          }
          if (cmd === 'get_ingredients') {
            return [];
          }
          if (cmd === 'get_kpis') {
            return {
              total_recipes: 0,
              total_ingredients: 0,
              avg_margin: 0,
              unpriced_ingredients: 0,
            };
          }
          if (cmd === 'set_setting') {
            return null;
          }
          return null;
        },
      };
    });
  });

  test('TC-THEME-01: Theme toggle button is located on header right side and not in sidebar', async ({
    page,
  }) => {
    await page.goto('/');

    const header = page.locator('header[data-purpose="top-navigation"]');
    await expect(header).toBeVisible();

    // Verify theme toggle button exists inside the header
    const headerThemeBtn = header.locator('#theme-toggle-btn');
    await expect(headerThemeBtn).toBeVisible();

    // Verify button is on the right side of the header
    const headerBox = await header.boundingBox();
    const btnBox = await headerThemeBtn.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(btnBox).not.toBeNull();
    if (headerBox && btnBox) {
      // The button should be located in the right half of the header
      expect(btnBox.x + btnBox.width / 2).toBeGreaterThan(headerBox.x + headerBox.width / 2);
    }

    // Verify theme toggle button is NO LONGER inside the sidebar
    const sidebar = page.locator('aside[data-purpose="sidebar-navigation"]');
    await expect(sidebar.locator('#theme-toggle-btn')).toHaveCount(0);
  });

  test('TC-THEME-02: Clicking theme toggle button switches theme and toggles dark mode class on html', async ({
    page,
  }) => {
    await page.goto('/');

    const themeBtn = page.locator('header #theme-toggle-btn');
    await expect(themeBtn).toBeVisible();

    // Initially light mode
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(themeBtn).toHaveAttribute('title', 'Switch to Dark Mode');
    await expect(themeBtn).toHaveAttribute('aria-label', 'Switch to Dark Mode');

    // Click to toggle to dark mode
    await themeBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(themeBtn).toHaveAttribute('title', 'Switch to Light Mode');
    await expect(themeBtn).toHaveAttribute('aria-label', 'Switch to Light Mode');

    // Click again to toggle back to light mode
    await themeBtn.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(themeBtn).toHaveAttribute('title', 'Switch to Dark Mode');
    await expect(themeBtn).toHaveAttribute('aria-label', 'Switch to Dark Mode');
  });
});
