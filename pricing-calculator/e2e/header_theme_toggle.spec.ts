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

  test('TC-THEME-03: Footer top border aligns with the top line border of Bottom Sidebar Footer', async ({
    page,
  }) => {
    await page.goto('/');
    const footer = page.locator('footer[data-purpose="system-status-sticky-footer"]');
    const sidebarFooter = page.locator('aside[data-purpose="sidebar-navigation"] > div').last();
    await expect(footer).toBeVisible();
    await expect(sidebarFooter).toBeVisible();

    const footerBox = await footer.boundingBox();
    const sidebarBox = await sidebarFooter.boundingBox();
    expect(footerBox).not.toBeNull();
    expect(sidebarBox).not.toBeNull();
    if (footerBox && sidebarBox) {
      // Both should have identical height (48px)
      expect(footerBox.height).toBe(48);
      expect(sidebarBox.height).toBe(48);
      // Top borders must align with 0px variance
      expect(Math.abs(footerBox.y - sidebarBox.y)).toBeLessThanOrEqual(0.5);
    }
  });

  test('TC-THEME-04: Header bottom border aligns with BakeIQLogo bottom border', async ({
    page,
  }) => {
    await page.goto('/');
    const header = page.locator('header[data-purpose="top-navigation"]');
    const logoHeader = page.locator('aside[data-purpose="sidebar-navigation"] > div:first-child > div:first-child');
    await expect(header).toBeVisible();
    await expect(logoHeader).toBeVisible();

    const headerBox = await header.boundingBox();
    const logoBox = await logoHeader.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(logoBox).not.toBeNull();
    if (headerBox && logoBox) {
      // Both should have identical height (80px)
      expect(headerBox.height).toBe(80);
      expect(logoBox.height).toBe(80);
      // Both start at y = 0
      expect(headerBox.y).toBe(0);
      expect(logoBox.y).toBe(0);
      // Bottom borders must align with 0px variance
      expect(Math.abs((headerBox.y + headerBox.height) - (logoBox.y + logoBox.height))).toBeLessThanOrEqual(0.5);
    }
  });
});
