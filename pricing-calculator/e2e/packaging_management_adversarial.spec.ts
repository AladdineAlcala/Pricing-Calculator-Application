import { test, expect } from '@playwright/test';

// ── Mock Packaging & Ingredient Types ─────────────────────────────────────────
interface MockPackagingItem {
  packaging_id: number;
  packaging_code: string;
  name: string;
  packaging_type: string;
  unit: string;
  current_unit_cost: number;
  current_stock_qty: number;
  reorder_threshold: number;
  total_value: number;
  is_low_stock: boolean;
}

interface MockStockDeficit {
  ingredient_name: string;
  required_bulk_qty: number;
  current_bulk_qty: number;
  deficit_qty: number;
  unit: string;
  item_type?: string;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // ── Transient Packaging Ledger Data ──
    const packagingLedger: MockPackagingItem[] = [
      {
        packaging_id: 1,
        packaging_code: 'PKG-BOX-01',
        name: 'Pastry Box Small 6x6x3',
        packaging_type: 'Box',
        unit: 'Piece',
        current_unit_cost: 8.5,
        current_stock_qty: 15.0, // Low stock (<= 20)
        reorder_threshold: 20.0,
        total_value: 127.5,
        is_low_stock: true,
      },
      {
        packaging_id: 2,
        packaging_code: 'PKG-BOX-02',
        name: 'Cake Box 8x8x5 Window',
        packaging_type: 'Box',
        unit: 'Piece',
        current_unit_cost: 18.0,
        current_stock_qty: 50.0,
        reorder_threshold: 15.0,
        total_value: 900.0,
        is_low_stock: false,
      },
      {
        packaging_id: 3,
        packaging_code: 'PKG-LIN-01',
        name: 'Parchment Liner 12x16',
        packaging_type: 'Liner',
        unit: 'Sheet',
        current_unit_cost: 1.25,
        current_stock_qty: 200.0,
        reorder_threshold: 50.0,
        total_value: 250.0,
        is_low_stock: false,
      },
      {
        packaging_id: 4,
        packaging_code: 'PKG-BAG-01',
        name: 'Kraft Bread Bag Medium',
        packaging_type: 'Bag',
        unit: 'Piece',
        current_unit_cost: 3.5,
        current_stock_qty: 5.0, // Low stock (<= 30)
        reorder_threshold: 30.0,
        total_value: 17.5,
        is_low_stock: true,
      },
    ];

    const ingredientLedger = [
      {
        ingredient_id: 1,
        name: 'Bread Flour',
        purchase_unit: 'Kilogram',
        purchase_price: 65.0,
        current_stock_qty: 2.0,
        reorder_threshold: 5.0,
        total_value: 130.0,
        is_low_stock: true,
      },
    ];

    const recipeCostResult = {
      recipe: {
        recipe_id: 1,
        name: 'Artisan Pastry Box Combo',
        yield_qty: 6,
        labor_cost: 80.0,
        electricity_cost: 25.0,
        other_overhead: 15.0,
        target_markup_pct: 60.0,
        reseller_markup_pct: 35.0,
        desired_profit_alert: 100.0,
        ingredient_cost: 120.0,
        unit_retail_price: 65.0,
      },
      line_items: [
        {
          id: 1,
          recipe_id: 1,
          ingredient_id: 1,
          ingredient_name: 'Bread Flour',
          batch_qty: 1.5,
          purchase_unit: 'Kilogram',
          purchase_price: 65.0,
          recipe_unit: 'Kilogram',
          yield_factor: 1.0,
          line_item_cost: 97.5,
          normalized_unit_cost: 65.0,
        },
      ],
      packaging_items: [
        {
          id: 1,
          recipe_id: 1,
          packaging_id: 1,
          batch_qty: 6.0, // 6 boxes per batch
          packaging_code: 'PKG-BOX-01',
          packaging_name: 'Pastry Box Small 6x6x3',
          packaging_type: 'Box',
          unit: 'Piece',
          current_unit_cost: 8.5,
          line_item_cost: 51.0,
        },
      ],
      total_ingredient_cost: 97.5,
      total_packaging_cost: 51.0,
      total_variable_cost: 148.5,
      total_overhead: 120.0,
      total_cost_per_batch: 268.5,
      cost_per_item: 44.75,
      retail_price_per_item: 71.6,
      reseller_price_per_item: 60.41,
      gross_profit_per_batch: 161.1,
      gross_margin_pct: 37.5,
      profit_alert_triggered: false,
      recommended_retail_price_item: 71.6,
      gross_profit_item: 26.85,
      retail_revenue_batch: 429.6,
    };

    // Tracking IPC calls
    (window as any).__INVOKE_HISTORY__ = [];

    // Mock Tauri IPC bridge
    (window as any).__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args: any) => {
        (window as any).__INVOKE_HISTORY__.push({ cmd, args, timestamp: Date.now() });

        if (cmd === 'get_packaging_inventory_ledger') {
          return packagingLedger;
        }

        if (cmd === 'get_packaging_list') {
          return packagingLedger.map((item) => ({
            packaging_id: item.packaging_id,
            packaging_code: item.packaging_code,
            name: item.name,
            packaging_type: item.packaging_type,
            unit: item.unit,
            current_unit_cost: item.current_unit_cost,
            current_stock_qty: item.current_stock_qty,
            reorder_threshold: item.reorder_threshold,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
        }

        if (cmd === 'get_inventory_ledger') {
          return ingredientLedger;
        }

        if (cmd === 'get_recipe_packaging') {
          return recipeCostResult.packaging_items;
        }

        if (cmd === 'calculate_recipe_cost') {
          return recipeCostResult;
        }

        if (cmd === 'get_recipe') {
          return recipeCostResult.recipe;
        }

        if (cmd === 'get_recipes') {
          return [recipeCostResult.recipe];
        }

        if (cmd === 'get_recipe_ingredients') {
          return recipeCostResult.line_items;
        }

        if (cmd === 'get_ingredients') {
          return [
            {
              ingredient_id: 1,
              name: 'Bread Flour',
              purchase_unit: 'Kilogram',
              purchase_price: 65.0,
              recipe_unit: 'Kilogram',
              yield_factor: 1.0,
              package_type: 'Sack',
              net_quantity: 1.0,
              net_unit: 'Kilogram',
              current_stock_qty: 2.0,
              reorder_threshold: 5.0,
              conversions: [],
            },
          ];
        }

        if (cmd === 'get_settings') {
          return [
            { setting_key: 'currency_symbol', setting_value: '₱' },
            { setting_key: 'tax_rate_pct', setting_value: '12' },
          ];
        }

        if (cmd === 'receive_packaging_inventory') {
          const payload = args.payload;
          if (payload.added_qty <= 0) {
            throw 'Added quantity must be strictly greater than zero';
          }
          if (payload.new_unit_cost < 0) {
            throw 'Unit cost cannot be negative';
          }
          const item = packagingLedger.find((p) => p.packaging_id === payload.packaging_id);
          if (item) {
            item.current_stock_qty += payload.added_qty;
            item.current_unit_cost = payload.new_unit_cost;
            item.total_value = item.current_stock_qty * item.current_unit_cost;
            item.is_low_stock = item.current_stock_qty <= item.reorder_threshold;
            return;
          }
          throw 'Packaging item not found';
        }

        if (cmd === 'produce_batch_with_validation') {
          const payload = args.payload;
          const batches = payload.batches || 1.0;

          // Required flour: 1.5 * batches (stock is 2.0)
          // Required box: 6.0 * batches (stock is 15.0)
          // If batches = 3: flour needed = 4.5 (> 2.0), boxes needed = 18.0 (> 15.0)
          const flourNeeded = 1.5 * batches;
          const boxesNeeded = 6.0 * batches;

          const flour = ingredientLedger[0];
          const box = packagingLedger[0];

          const deficits: MockStockDeficit[] = [];
          if (flour.current_stock_qty < flourNeeded) {
            deficits.push({
              ingredient_name: flour.name,
              required_bulk_qty: flourNeeded,
              current_bulk_qty: flour.current_stock_qty,
              deficit_qty: flourNeeded - flour.current_stock_qty,
              unit: flour.purchase_unit,
              item_type: 'ingredient',
            });
          }
          if (box.current_stock_qty < boxesNeeded) {
            deficits.push({
              ingredient_name: box.name,
              required_bulk_qty: boxesNeeded,
              current_bulk_qty: box.current_stock_qty,
              deficit_qty: boxesNeeded - box.current_stock_qty,
              unit: box.unit,
              item_type: 'packaging',
            });
          }

          if (deficits.length > 0) {
            throw {
              message: `Insufficient stock to produce ${batches} batch(es). ${deficits.length} material(s) in deficit.`,
              deficits,
            };
          }

          flour.current_stock_qty -= flourNeeded;
          box.current_stock_qty -= boxesNeeded;

          return {
            recipe_id: payload.recipe_id,
            recipe_name: recipeCostResult.recipe.name,
            batches_produced: batches,
            timestamp: new Date().toISOString(),
          };
        }

        return null;
      },
    };
  });
});

test.describe('Adversarial Test Suite: Packaging Management & Costing Engine', () => {
  test('Vector 01: Packaging Materials tab renders ledger and filters by type correctly', async ({
    page,
  }) => {
    await page.goto('/inventory');

    // Switch to Packaging Materials Tab
    const packagingTab = page.locator('button:has-text("Packaging Materials")');
    await expect(packagingTab).toBeVisible();
    await packagingTab.click();

    // Verify Tab active state and badge
    await expect(page.locator('text=Discrete Unit Tracking')).toBeVisible();

    // Verify all 4 mock packaging items are visible in ledger
    await expect(page.locator('tr:has-text("Pastry Box Small 6x6x3")')).toBeVisible();
    await expect(page.locator('tr:has-text("Cake Box 8x8x5 Window")')).toBeVisible();
    await expect(page.locator('tr:has-text("Parchment Liner 12x16")')).toBeVisible();
    await expect(page.locator('tr:has-text("Kraft Bread Bag Medium")')).toBeVisible();

    // Verify Low Stock living aura / warning badge on item below reorder floor (Pastry Box: 15 <= 20)
    const pastryBoxRow = page.locator('tr:has-text("Pastry Box Small 6x6x3")');
    await expect(pastryBoxRow).toContainText('REORDER ALERT');

    // Test Packaging Type Filter Pills
    const linerPill = page.locator('button:has-text("Liner")');
    if (await linerPill.isVisible()) {
      await linerPill.click();
      await expect(page.locator('tr:has-text("Parchment Liner 12x16")')).toBeVisible();
      await expect(page.locator('tr:has-text("Cake Box 8x8x5 Window")')).not.toBeVisible();
    }
  });

  test('Vector 02: ReceivePackagingModal reactive input validation and real-time total computation', async ({
    page,
  }) => {
    await page.goto('/inventory');

    // Go to packaging tab
    await page.locator('button:has-text("Packaging Materials")').click();

    // Click "+ Receive Packaging" button
    const receivePkgBtn = page.locator('button:has-text("+ Receive Packaging")');
    await expect(receivePkgBtn).toBeVisible();
    await receivePkgBtn.click();

    // Target modal dialog
    const dialog = page.locator('role=dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Receive Packaging Delivery');

    // Initially submit button should be disabled because quantity is 0
    const submitBtn = dialog.locator('button:has-text("Commit Stock-In")');
    await expect(submitBtn).toBeDisabled();

    // Input quantity: 50 in the Quantity Received spinbutton
    const qtyInput = dialog.getByRole('spinbutton', { name: 'Quantity Received' });
    await qtyInput.fill('50');

    // Verify real-time computed invoice value
    // Selected item is Pastry Box Small @ 8.50 -> 50 * 8.50 = ₱425.00
    await expect(dialog).toContainText('₱425.00');

    // Update Unit Cost to 10.00 -> 50 * 10.00 = ₱500.00
    const costInput = dialog.getByRole('spinbutton', { name: 'Unit Cost' });
    await costInput.fill('10');
    await expect(dialog).toContainText('₱500.00');

    // Submit valid delivery
    await submitBtn.click();
    await expect(dialog).not.toBeVisible();

    // Verify IPC call was dispatched with correct payload
    const history = await page.evaluate(() => (window as any).__INVOKE_HISTORY__);
    const receiveCall = history.find((h: any) => h.cmd === 'receive_packaging_inventory');
    expect(receiveCall).toBeDefined();
    expect(receiveCall.args.payload.added_qty).toBe(50);
    expect(receiveCall.args.payload.new_unit_cost).toBe(10);
  });

  test('Vector 03: RecipeBuilder displays packaging line items and 3-way cost distribution bar', async ({
    page,
  }) => {
    await page.goto('/recipes/1');

    // Verify Packaging Section is rendered
    await expect(page.getByRole('heading', { name: 'Recipe Packaging & Presentation' })).toBeVisible();

    // Verify Packaging Line Item (Pastry Box Small @ ₱51.00)
    await expect(page.locator('tr:has-text("Pastry Box Small 6x6x3")')).toBeVisible();
    await expect(page.locator('text=Subtotal Packaging:')).toBeVisible();
    await expect(page.locator('text=₱51.00').first()).toBeVisible();

    // Verify Cost Summary Hero Card displays 3-way breakdown:
    // Raw Ingredients, Packaging & Materials, Fixed Overhead
    await expect(page.locator('text=Raw Ingredients:')).toBeVisible();
    await expect(page.locator('text=Packaging & Materials:')).toBeVisible();
    await expect(page.getByText('Fixed Overhead:', { exact: true })).toBeVisible();

    // Verify Cost Distribution Bar percentages
    // Total batch cost = 268.50
    // Ingredients: 97.50 / 268.50 = 36%
    // Packaging: 51.00 / 268.50 = 19%
    // Overhead: 120.00 / 268.50 = 45%
    await expect(page.locator('text=36% Ingredients')).toBeVisible();
    await expect(page.locator('text=19% Packaging')).toBeVisible();
    await expect(page.locator('text=45% Overhead')).toBeVisible();
  });

  test('Vector 04: Batch production dual shortfall halts transaction and displays distinct item badges', async ({
    page,
  }) => {
    await page.goto('/recipes/1');

    // Input 3 batches (Flour required 4.5 > 2.0 stock; Boxes required 18 > 15 stock)
    const batchInput = page.getByRole('spinbutton', { name: 'Batches:' });
    await batchInput.fill('3');

    // Click Produce & Deduct Stock
    const produceBtn = page.getByRole('button', { name: 'Produce & Deduct Stock' });
    await produceBtn.click();

    // Verify StockDeficitModal triggers and blocks production
    const deficitModal = page.locator('[aria-labelledby="deficit-modal-title"]');
    await expect(deficitModal).toBeVisible();
    await expect(deficitModal).toContainText('Production Hard Stop — Stock Deficit Detected');
    await expect(deficitModal).toContainText('Shortfall Analysis (2 items)');

    // Verify dual shortfall table shows both Ingredient and Packaging
    await expect(deficitModal.locator('tr:has-text("Bread Flour")')).toBeVisible();
    await expect(deficitModal.locator('tr:has-text("Pastry Box Small 6x6x3")')).toBeVisible();

    // Verify Packaging and Ingredient item type badges are displayed
    await expect(deficitModal.locator('span:has-text("Packaging")').first()).toBeVisible();
    await expect(deficitModal.locator('span:has-text("Ingredient")').first()).toBeVisible();

    // Close deficit alert modal
    const closeBtn = deficitModal.locator('button[aria-label="Close deficit alert"]');
    await closeBtn.click();
    await expect(deficitModal).not.toBeVisible();
  });

  test('Vector 05: Quick stock-in action from deficit modal routes to delivery modal with item preselected', async ({
    page,
  }) => {
    await page.goto('/recipes/1');

    // Trigger deficit
    const batchInput = page.getByRole('spinbutton', { name: 'Batches:' });
    await batchInput.fill('3');
    await page.getByRole('button', { name: 'Produce & Deduct Stock' }).click();

    // Deficit modal is open
    const deficitModal = page.locator('[aria-labelledby="deficit-modal-title"]');
    await expect(deficitModal).toBeVisible();

    // Click "Receive" action button on the Packaging deficit row
    const pkgRow = deficitModal.locator('tr:has-text("Pastry Box Small 6x6x3")');
    const receiveBtn = pkgRow.locator('button:has-text("Receive")');
    await receiveBtn.click();

    // Deficit modal closes and ReceivePackagingModal opens
    await expect(deficitModal).not.toBeVisible();
    const pkgDialog = page.locator('[aria-labelledby="packaging-delivery-modal-title"]');
    await expect(pkgDialog).toBeVisible();
    await expect(pkgDialog).toContainText('Receive Packaging Delivery');

    // Verify preselected packaging item is Pastry Box Small 6x6x3
    await expect(pkgDialog).toContainText('Pastry Box Small 6x6x3');
  });
});
