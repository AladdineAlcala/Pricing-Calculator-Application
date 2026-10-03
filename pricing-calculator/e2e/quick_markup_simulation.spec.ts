import { test, expect } from '@playwright/test';

test.describe('Quick Markup Simulation Presets (20%, 30%, 40%, 50%, 60%, 75%, 100%)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      let currentMarkup = 50.0;

      const mockRecipe = {
        recipe_id: 1,
        name: 'Artisan Sourdough',
        yield_qty: 10,
        labor_cost: 40.0,
        electricity_cost: 20.0,
        other_overhead: 0.0,
        target_markup_pct: currentMarkup,
        reseller_markup_pct: 20.0,
        desired_profit_alert: 50.0,
        ingredient_cost: 40.0,
        unit_retail_price: 15.0,
      };

      const mockIngredients = [
        {
          id: 1,
          recipe_id: 1,
          ingredient_id: 1,
          batch_qty: 2.0,
          ingredient_name: 'Bread Flour',
          purchase_unit: 'kg',
          purchase_price: 20.0,
          recipe_unit: 'kg',
          yield_factor: 1.0,
          package_type: 'Bag',
          net_quantity: 1.0,
          net_unit: 'kg',
          is_orphaned_conversion: false,
          normalized_unit_cost: 20.0,
          line_item_cost: 40.0,
          base_unit_code: 'kg',
          base_unit_cost: 20.0,
          normalized_quantity: 2.0,
        },
      ];

      (window as any).__TAURI_INTERNALS__ = {
        invoke: async (cmd: string, args: any) => {
          if (cmd === 'get_settings') {
            return [
              { setting_key: 'currency_symbol', setting_value: '₱' },
              { setting_key: 'theme', setting_value: 'light' },
            ];
          }
          if (cmd === 'get_active_notifications') return [];
          if (cmd === 'get_units') return [];
          if (cmd === 'get_ingredients') return [];
          if (cmd === 'get_recipe_packaging') return [];
          if (cmd === 'get_packaging_list') return [];
          if (cmd === 'get_recipes') return [mockRecipe];
          if (cmd === 'get_recipe_ingredients') return mockIngredients;
          if (cmd === 'update_recipe') {
            const input = args.input || args;
            if (input.target_markup_pct !== undefined) {
              currentMarkup = input.target_markup_pct;
              mockRecipe.target_markup_pct = currentMarkup;
            }
            return null;
          }
          if (cmd === 'calculate_recipe_cost') {
            const costPerItem = 10.0; // ₱100 total batch / 10 items
            const rrp = costPerItem * (1 + currentMarkup / 100);
            const grossProfitItem = rrp - costPerItem;
            const grossMarginPct = (grossProfitItem / rrp) * 100;
            return {
              recipe: {
                ...mockRecipe,
                target_markup_pct: currentMarkup,
              },
              line_items: mockIngredients,
              packaging_items: [],
              total_variable_cost: 40.0,
              total_packaging_cost: 0.0,
              total_overhead: 60.0,
              total_cost_per_batch: 100.0,
              cost_per_item: costPerItem,
              retail_price_per_item: rrp,
              reseller_price_per_item: costPerItem * 1.2,
              gross_profit_per_batch: grossProfitItem * 10,
              profit_alert_triggered: grossProfitItem * 10 < mockRecipe.desired_profit_alert,
              recommended_retail_price_item: rrp,
              gross_profit_item: grossProfitItem,
              gross_margin_pct: grossMarginPct,
              retail_revenue_batch: rrp * 10,
            };
          }
          return null;
        },
      };
    });
  });

  test('TC-MARKUP-01: Displays all 7 requested preset figures in standard presets grid', async ({
    page,
  }) => {
    await page.goto('/recipes/1');

    const expectedPresets = [20, 30, 40, 50, 60, 75, 100];
    for (const pct of expectedPresets) {
      const btn = page.locator(`[data-purpose="quick-markup-preset-${pct}"]`);
      await expect(btn).toBeVisible();
      await expect(btn).toHaveText(`+${pct}%`);
    }

    // Dynamic buttons also visible
    await expect(page.locator('[data-purpose="quick-markup-current"]')).toBeVisible();
    await expect(page.locator('[data-purpose="quick-markup-optimal"]')).toBeVisible();
  });

  test('TC-MARKUP-02: Initial recipe markup (50%) is visually highlighted as active preset', async ({
    page,
  }) => {
    await page.goto('/recipes/1');

    const btn50 = page.locator('[data-purpose="quick-markup-preset-50"]');
    await expect(btn50).toHaveClass(/bg-emerald-600/);

    const btn20 = page.locator('[data-purpose="quick-markup-preset-20"]');
    await expect(btn20).not.toHaveClass(/bg-emerald-600/);
  });

  test('TC-MARKUP-03: Clicking +75% updates active markup, recalculates RRP and highlights +75%', async ({
    page,
  }) => {
    await page.goto('/recipes/1');

    // Click +75% preset
    const btn75 = page.locator('[data-purpose="quick-markup-preset-75"]');
    await btn75.click();

    // Verify +75% becomes active
    await expect(btn75).toHaveClass(/bg-emerald-600/);

    // Verify RRP recalculated to ₱17.50 (cost 10 * 1.75 = 17.50)
    await expect(page.locator('text=₱17.50').first()).toBeVisible();
  });

  test('TC-MARKUP-04: Clicking +100% doubles the base cost to ₱20.00 RRP', async ({
    page,
  }) => {
    await page.goto('/recipes/1');

    // Click +100% preset
    const btn100 = page.locator('[data-purpose="quick-markup-preset-100"]');
    await btn100.click();

    // Verify +100% becomes active
    await expect(btn100).toHaveClass(/bg-emerald-600/);

    // Verify RRP recalculated to ₱20.00 (cost 10 * 2.0 = 20.00)
    await expect(page.locator('text=₱20.00').first()).toBeVisible();

    // Verify Gross Margin recalculated to 50.0% (profit 10 / price 20)
    await expect(page.locator('text=50.0%').first()).toBeVisible();
  });
});
