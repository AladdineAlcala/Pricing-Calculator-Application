import { test, expect } from '@playwright/test';

test.describe('Base-Unit Normalized Conversion Engine (v2.0)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const mockUnits = [
        { unit_id: 1, code: 'g', name: 'Gram', unit_type: 'weight', is_base: true },
        { unit_id: 2, code: 'kg', name: 'Kilogram', unit_type: 'weight', is_base: false },
        { unit_id: 3, code: 'ml', name: 'Milliliter', unit_type: 'volume', is_base: true },
        { unit_id: 4, code: 'L', name: 'Liter', unit_type: 'volume', is_base: false },
        { unit_id: 5, code: 'pcs', name: 'Piece', unit_type: 'count', is_base: true },
      ];

      const mockIngredients = [
        {
          ingredient_id: 1,
          name: 'Premium All-Purpose Flour',
          purchase_unit: 'Bag (1 Kilogram)',
          purchase_price: 50.0,
          recipe_unit: 'Cup',
          yield_factor: 8.0,
          package_type: 'Bag',
          net_quantity: 1.0,
          net_unit: 'kg',
          current_stock_qty: 10.0,
          reorder_threshold: 2.0,
          supplier: 'San Miguel Mills Corp',
          sku: 'SMM-FLR-01',
          base_unit_id: 1,
          category: 'Bulk Dry Goods',
          conversions: [
            {
              conversion_id: 1,
              ingredient_id: 1,
              recipe_unit: 'Cup',
              yield_factor: 8.0,
              conversion_factor: 125.0,
              is_active: true,
            },
            {
              conversion_id: 2,
              ingredient_id: 1,
              recipe_unit: 'Gram',
              yield_factor: 1000.0,
              conversion_factor: 1.0,
              is_active: true,
            },
          ],
          purchases: [
            {
              purchase_id: 101,
              ingredient_id: 1,
              supplier_name: 'San Miguel Mills',
              package_quantity: 1.0,
              package_unit_id: 2,
              purchase_price: 50.0,
              purchase_date: '2026-09-15T08:00:00Z',
              is_active: true,
            },
          ],
        },
      ];

      const mockRecipe = {
        recipe_id: 1,
        name: 'Classic Pandesal',
        yield_qty: 24,
        labor_cost: 30.0,
        electricity_cost: 15.0,
        other_overhead: 10.0,
        target_markup_pct: 50.0,
        reseller_markup_pct: 25.0,
        desired_profit_alert: 5.0,
        ingredient_cost: 6.25,
        unit_retail_price: 3.82,
      };

      const mockRecipeLineItems = [
        {
          id: 1,
          recipe_id: 1,
          ingredient_id: 1,
          conversion_id: 1,
          batch_qty: 1.0,
          ingredient_name: 'Premium All-Purpose Flour',
          purchase_unit: 'Bag (1 Kilogram)',
          purchase_price: 50.0,
          recipe_unit: 'Cup',
          yield_factor: 8.0,
          package_type: 'Bag',
          net_quantity: 1.0,
          net_unit: 'kg',
          is_orphaned_conversion: false,
          normalized_unit_cost: 6.25,
          line_item_cost: 6.25,
          base_unit_code: 'g',
          base_unit_cost: 0.05,
          normalized_quantity: 125.0,
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
          if (cmd === 'get_units') {
            return [...mockUnits];
          }
          if (cmd === 'get_ingredients') {
            return [...mockIngredients];
          }
          if (cmd === 'create_ingredient') {
            const input = args.input || args;
            const newId = mockIngredients.length + 1;
            const created = {
              ingredient_id: newId,
              name: input.name,
              purchase_unit: input.purchase_unit,
              purchase_price: input.purchase_price,
              recipe_unit: input.recipe_unit,
              yield_factor: input.yield_factor,
              package_type: input.package_type,
              net_quantity: input.net_quantity,
              net_unit: input.net_unit,
              supplier: input.supplier || null,
              sku: input.sku || null,
              base_unit_id: input.base_unit_id || null,
              category: input.category || null,
              current_stock_qty: 0,
              reorder_threshold: 0,
              conversions: input.conversions || [],
              purchases: [],
            };
            mockIngredients.push(created);
            return created;
          }
          if (cmd === 'update_ingredient') {
            const id = args.ingredientId ?? args.ingredient_id ?? args.id;
            const input = args.input || args;
            const idx = mockIngredients.findIndex((i) => Number(i.ingredient_id) === Number(id));
            if (idx >= 0) {
              mockIngredients[idx] = {
                ...mockIngredients[idx],
                ...input,
                ingredient_id: mockIngredients[idx].ingredient_id,
              };
            }
            return null;
          }
          if (cmd === 'get_recipes') {
            return [mockRecipe];
          }
          if (cmd === 'get_recipe_ingredients') {
            return [...mockRecipeLineItems];
          }
          if (cmd === 'calculate_recipe_cost') {
            return {
              recipe: mockRecipe,
              line_items: mockRecipeLineItems,
              total_variable_cost: 6.25,
              total_overhead: 55.0,
              total_cost_per_batch: 61.25,
              cost_per_item: 2.55,
              retail_price_per_item: 3.83,
              reseller_price_per_item: 3.19,
              gross_profit_per_batch: 30.63,
              profit_alert_triggered: false,
              recommended_retail_price_item: 3.83,
              gross_profit_item: 1.28,
              gross_margin_pct: 33.33,
              retail_revenue_batch: 91.88,
            };
          }
          return null;
        },
      };
    });
  });

  test('TC-BU-01: Displays Base Unit badge in Ingredients list and renders base unit selector in modal', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('body')).toBeVisible();

    // Verify ingredient row renders Base: g badge
    await expect(page.getByText('Base: g')).toBeVisible();

    // Open Edit modal via ID
    const editBtn = page.locator('#edit-ingredient-1');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Verify Canonical Base Unit selector exists
    const baseSelector = page.locator('#base-unit-selector');
    await expect(baseSelector).toBeVisible();

    // Verify conversion table headers
    await expect(page.getByText('Conversion Factor (Base Qty)')).toBeVisible();
    await expect(page.getByText('Yield Factor (Derived)')).toBeVisible();

    // Verify Purchase Records & Supplier History table rendered
    await expect(page.getByText('PURCHASE RECORDS & SUPPLIER HISTORY')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'San Miguel Mills', exact: true })).toBeVisible();
  });

  test('TC-BU-02: Synchronizes live conversion factor and yield factor in modal', async ({ page }) => {
    await page.goto('/ingredients');
    await page.locator('#edit-ingredient-1').click();

    // Locate the first conversion factor input
    const convFactorInput = page.locator('#conv-factor-0');
    await expect(convFactorInput).toBeVisible();
    await expect(convFactorInput).toHaveValue('125');

    // Change conversion factor to 200 (e.g. denser product)
    await convFactorInput.fill('200');
    await convFactorInput.blur();

    // Yield factor should dynamically update: 1000g / 200 = 5
    const yieldInput = page.locator('#yield-factor-0');
    await expect(yieldInput).toHaveValue('5');
  });

  test('TC-BU-03: RecipeBuilder displays Base Unit Cost and Normalized Quantity', async ({ page }) => {
    await page.goto('/recipes/1');
    await expect(page.locator('body')).toBeVisible();

    // Check table header has Base & Unit Cost
    await expect(page.getByText('Base & Unit Cost')).toBeVisible();

    // Check Base Unit Cost display (Base: ₱0.05/g)
    await expect(page.getByText('Base: ₱0.05/g')).toBeVisible();

    // Check Normalized Quantity display (≈ 125.0 g)
    await expect(page.getByText('≈ 125.0 g')).toBeVisible();
  });
});
