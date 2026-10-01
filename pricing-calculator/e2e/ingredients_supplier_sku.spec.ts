import { test, expect } from '@playwright/test';

test.describe('Ingredients: Supplier / Brand and SKU / Storage Location Persistence & Modal Ergonomics', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const mockIngredients = [
        {
          ingredient_id: 101,
          name: 'First Class Bread Flour',
          purchase_unit: 'Sack (25 Kilogram)',
          purchase_price: 950.0,
          recipe_unit: 'Cup',
          yield_factor: 125.0,
          package_type: 'Sack',
          net_quantity: 25.0,
          net_unit: 'Kilogram',
          current_stock_qty: 10.0,
          reorder_threshold: 2.0,
          supplier: 'San Miguel Mills Corp',
          sku: 'SMM-FLR-01',
          conversions: [
            { conversion_id: 1, ingredient_id: 101, recipe_unit: 'Cup', yield_factor: 125.0 },
            { conversion_id: 2, ingredient_id: 101, recipe_unit: 'Gram', yield_factor: 25000.0 },
          ],
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
            return [
              { unit_id: 1, code: 'g', name: 'Gram', unit_type: 'weight', is_base: true },
              { unit_id: 2, code: 'kg', name: 'Kilogram', unit_type: 'weight', is_base: false },
              { unit_id: 3, code: 'ml', name: 'Milliliter', unit_type: 'volume', is_base: true },
            ];
          }
          if (cmd === 'get_ingredients') {
            return [...mockIngredients];
          }
          if (cmd === 'create_ingredient') {
            const input = args.input || args;
            const newId = mockIngredients.length + 101;
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
              current_stock_qty: input.current_stock_qty || 0,
              reorder_threshold: input.reorder_threshold || 0,
              conversions: input.conversions || [],
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
                supplier: input.supplier ?? null,
                sku: input.sku ?? null,
              };
            }
            return null;
          }
          if (cmd === 'get_recipes') {
            return [];
          }
          if (cmd === 'get_inventory_ledger') {
            return [];
          }
          return null;
        },
      };
    });
  });

  test('TC-01: Displays saved supplier and SKU in ingredients table list', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('body')).toBeVisible();

    // Verify ingredient row renders name
    await expect(page.getByText('First Class Bread Flour')).toBeVisible();

    // Verify SKU and Supplier are rendered in the subtitle row
    await expect(page.getByText('SKU: SMM-FLR-01')).toBeVisible();
    await expect(page.getByText('San Miguel Mills Corp')).toBeVisible();
  });

  test('TC-02: Modal shows Supplier and SKU as Optional with balanced layout and custom select arrows', async ({ page }) => {
    await page.goto('/ingredients');

    // Click Add New Ingredient button
    const addBtn = page.getByRole('button', { name: /Add Ingredient/i }).first();
    await addBtn.click();

    // Modal dialog should appear
    await expect(page.getByRole('heading', { name: 'Add New Ingredient' })).toBeVisible();

    // Check optional badges for Supplier and SKU (there should be 2 optional badges in the modal)
    const optionalBadges = page.locator('span:text-is("Optional")');
    await expect(optionalBadges).toHaveCount(2);

    // Verify select elements inside modal use appearance-none for balanced styling
    const modalSelect = page.locator('.fixed select').first();
    await expect(modalSelect).toHaveClass(/appearance-none/);
  });

  test('TC-03: Editing existing ingredient loads saved Supplier and SKU and allows updating them', async ({ page }) => {
    await page.goto('/ingredients');

    // Hover or find the edit button on the ingredient row
    const editBtn = page.locator('#edit-ingredient-101');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Verify Edit Ingredient modal title
    await expect(page.getByRole('heading', { name: 'Edit Ingredient' })).toBeVisible();

    // Verify input fields have existing saved values
    const supplierInput = page.getByPlaceholder('e.g., San Miguel Mills / Metro Mart');
    await expect(supplierInput).toHaveValue('San Miguel Mills Corp');

    const skuInput = page.getByPlaceholder('e.g., DRY-BIN-04');
    await expect(skuInput).toHaveValue('SMM-FLR-01');

    // Update values
    await supplierInput.fill('Universal Robina Corp');
    await skuInput.fill('URC-BIN-09');

    // Click Save Changes
    const saveBtn = page.locator('#save-ingredient-btn');
    await saveBtn.click();

    // Modal should close
    await expect(page.getByRole('heading', { name: 'Edit Ingredient' })).not.toBeVisible();

    // Updated supplier and SKU should be visible in the table
    await expect(page.getByText('SKU: URC-BIN-09')).toBeVisible();
    await expect(page.getByText('Universal Robina Corp')).toBeVisible();
  });
});
