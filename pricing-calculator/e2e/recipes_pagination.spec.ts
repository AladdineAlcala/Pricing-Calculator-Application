import { test, expect } from '@playwright/test';

test.describe('Recipe Master Pagination Component Placement & Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Generate 14 mock recipes to test multi-page pagination (3 pages @ 6 per page)
      const mockRecipes = Array.from({ length: 14 }, (_, i) => ({
        recipe_id: i + 1,
        name: `Recipe Item ${i + 1}`,
        yield_qty: 12,
        labor_cost: 50.0,
        electricity_cost: 15.0,
        other_overhead: 10.0,
        target_markup_pct: 60.0,
        reseller_markup_pct: 30.0,
        desired_profit_alert: 40.0,
        ingredient_cost: 120.0,
        unit_retail_price: 25.0,
      }));

      (window as any).__TAURI_INTERNALS__ = {
        invoke: async (cmd: string) => {
          if (cmd === 'get_recipes') {
            return mockRecipes;
          }
          if (cmd === 'get_settings') {
            return [
              { setting_key: 'currency_symbol', setting_value: '₱' },
              { setting_key: 'theme', setting_value: 'dark' },
            ];
          }
          return null;
        },
      };
    });
  });

  test('Pagination component is displayed on the lower right side with proper alignment and controls', async ({
    page,
  }) => {
    await page.goto('/recipes');

    // 1. Verify bottom bar container exists
    const bottomBar = page.locator('div:has([data-purpose="recipe-pagination"])').first();
    await expect(bottomBar).toBeVisible();

    // 2. Verify summary text is on the left
    await expect(bottomBar).toContainText('Showing 1 to 6 of 14 recipes');
    await expect(bottomBar).toContainText('Page 1 of 3');

    // 3. Verify pagination component is positioned on the right side
    const paginationControls = page.locator('[data-purpose="recipe-pagination"]');
    await expect(paginationControls).toBeVisible();

    // Check geometrical alignment: pagination element must be in the right half of the bottom bar
    const barBox = await bottomBar.boundingBox();
    const pagBox = await paginationControls.boundingBox();
    expect(barBox).not.toBeNull();
    expect(pagBox).not.toBeNull();

    if (barBox && pagBox) {
      const barMidpointX = barBox.x + barBox.width / 2;
      // The start of the pagination box must be positioned towards the right side of the bottom bar
      expect(pagBox.x + pagBox.width).toBeGreaterThan(barMidpointX);
      // Right edge of pagination should be near the right edge of the bottom bar
      expect(barBox.x + barBox.width - (pagBox.x + pagBox.width)).toBeLessThan(60);
    }

    // 4. Test boundary state: Page 1 Previous button disabled
    const prevBtn = paginationControls.locator('button:has-text("Previous")');
    const nextBtn = paginationControls.locator('button:has-text("Next")');
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeEnabled();

    // 5. Navigate to Page 2
    await nextBtn.click();
    await expect(bottomBar).toContainText('Showing 7 to 12 of 14 recipes');
    await expect(bottomBar).toContainText('Page 2 of 3');
    await expect(prevBtn).toBeEnabled();
    await expect(nextBtn).toBeEnabled();

    // 6. Navigate to Page 3 (last page)
    await nextBtn.click();
    await expect(bottomBar).toContainText('Showing 13 to 14 of 14 recipes');
    await expect(bottomBar).toContainText('Page 3 of 3');
    await expect(prevBtn).toBeEnabled();
    await expect(nextBtn).toBeDisabled();

    // 7. Click page number directly
    const page1Btn = paginationControls.locator('button:has-text("1")');
    await page1Btn.click();
    await expect(bottomBar).toContainText('Showing 1 to 6 of 14 recipes');
    await expect(prevBtn).toBeDisabled();
  });

  test('Pagination component remains positioned on lower right side in list view mode', async ({
    page,
  }) => {
    await page.goto('/recipes');

    // Switch to List View Mode
    const listModeBtn = page.locator('button:has(svg.lucide-list)');
    await listModeBtn.click();

    // Verify table is rendered
    await expect(page.locator('table')).toBeVisible();

    // Verify pagination controls are still right-aligned
    const paginationControls = page.locator('[data-purpose="recipe-pagination"]');
    await expect(paginationControls).toBeVisible();

    const bottomBar = page.locator('div:has([data-purpose="recipe-pagination"])').first();
    const barBox = await bottomBar.boundingBox();
    const pagBox = await paginationControls.boundingBox();
    expect(barBox).not.toBeNull();
    expect(pagBox).not.toBeNull();

    if (barBox && pagBox) {
      expect(barBox.x + barBox.width - (pagBox.x + pagBox.width)).toBeLessThan(60);
    }
  });
});
