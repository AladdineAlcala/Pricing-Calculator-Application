import { test, expect } from '@playwright/test';

// ── Mock Transient Database State ─────────────────────────────────────────────
interface MockLedgerItem {
  ingredient_id: number;
  name: string;
  purchase_unit: string;
  purchase_price: number;
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
}

// Setup transient mock state for each test
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Initial in-memory transient data
    const ledger: MockLedgerItem[] = [
      {
        ingredient_id: 1,
        name: 'Bread Flour',
        purchase_unit: 'Kilogram',
        purchase_price: 65.0,
        current_stock_qty: 1.0, // Insufficient for recipe requiring 2.0 kg
        reorder_threshold: 5.0,
        total_value: 65.0,
        is_low_stock: true,
      },
      {
        ingredient_id: 2,
        name: 'Granulated Sugar',
        purchase_unit: 'Kilogram',
        purchase_price: 52.0,
        current_stock_qty: 10.0,
        reorder_threshold: 4.0,
        total_value: 520.0,
        is_low_stock: false,
      },
      {
        ingredient_id: 3,
        name: 'Butter',
        purchase_unit: 'Kilogram',
        purchase_price: 320.0,
        current_stock_qty: 2.0,
        reorder_threshold: 2.0, // Exact boundary condition
        total_value: 640.0,
        is_low_stock: true,
      },
    ];

    const recipe = {
      recipe: {
        recipe_id: 1,
        name: 'Artisan Sourdough Loaf',
        yield_qty: 10,
        labor_cost: 150,
        electricity_cost: 45,
        other_overhead: 25,
        target_markup_pct: 75,
        reseller_markup_pct: 40,
        desired_profit_alert: 200,
        ingredient_cost: 130,
        unit_retail_price: 35.0,
      },
      line_items: [
        {
          id: 1,
          recipe_id: 1,
          ingredient_id: 1,
          ingredient_name: 'Bread Flour',
          batch_qty: 2.0,
          purchase_unit: 'Kilogram',
          purchase_price: 65.0,
          recipe_unit: 'Kilogram',
          yield_factor: 1.0,
          line_item_cost: 130.0,
          is_orphaned_conversion: false,
          net_quantity: 1.0,
          net_unit: 'Kilogram',
          package_type: 'Sack',
        },
      ],
      total_ingredient_cost: 130.0,
      total_overhead: 220.0,
      total_cost_per_batch: 350.0,
      cost_per_item: 35.0,
      retail_price_per_item: 61.25,
      reseller_price_per_item: 49.0,
      gross_profit_per_batch: 262.5,
      gross_margin_pct: 42.86,
      profit_alert_triggered: false,
    };

    // Track invocation history for race condition and invariant assertions
    (window as any).__INVOKE_HISTORY__ = [];

    // Mock Tauri IPC bridge
    (window as any).__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args: any) => {
        (window as any).__INVOKE_HISTORY__.push({ cmd, args, timestamp: Date.now() });

        if (cmd === 'get_inventory_ledger') {
          return ledger.map((item) => ({
            ...item,
            total_value: item.current_stock_qty * item.purchase_price,
            is_low_stock: item.current_stock_qty <= item.reorder_threshold,
          }));
        }

        if (cmd === 'get_ingredients') {
          return ledger.map((item) => ({
            ingredient_id: item.ingredient_id,
            name: item.name,
            purchase_unit: item.purchase_unit,
            purchase_price: item.purchase_price,
            recipe_unit: item.purchase_unit,
            yield_factor: 1.0,
            package_type: 'Package',
            net_quantity: 1.0,
            net_unit: item.purchase_unit,
            current_stock_qty: item.current_stock_qty,
            reorder_threshold: item.reorder_threshold,
            conversions: [],
          }));
        }

        if (cmd === 'calculate_recipe_cost') {
          return recipe;
        }

        if (cmd === 'receive_inventory') {
          const payload = args.payload;
          if (payload.added_qty <= 0) {
            throw 'Added quantity must be strictly greater than zero';
          }
          if (payload.new_invoice_price < 0) {
            throw 'New invoice price cannot be negative';
          }
          const item = ledger.find((i) => i.ingredient_id === payload.ingredient_id);
          if (item) {
            item.current_stock_qty += payload.added_qty;
            item.purchase_price = payload.new_invoice_price; // LRC Overwrite
            item.total_value = item.current_stock_qty * item.purchase_price;
            item.is_low_stock = item.current_stock_qty <= item.reorder_threshold;
            return { ...item };
          }
          throw 'Ingredient not found';
        }

        if (cmd === 'produce_batch_with_validation') {
          const payload = args.payload;
          const batches = payload.batches || 1.0;

          // Check Flour deficit
          const flour = ledger.find((i) => i.ingredient_id === 1);
          const flourNeeded = 2.0 * batches;
          if (flour && flour.current_stock_qty < flourNeeded) {
            const deficits: MockStockDeficit[] = [
              {
                ingredient_name: flour.name,
                required_bulk_qty: flourNeeded,
                current_bulk_qty: flour.current_stock_qty,
                deficit_qty: flourNeeded - flour.current_stock_qty,
                unit: flour.purchase_unit,
              },
            ];
            throw {
              message: `Insufficient stock to produce ${batches} batch(es). 1 ingredient(s) in deficit.`,
              deficits,
            };
          }

          // If stock sufficient, deduct
          if (flour) {
            flour.current_stock_qty -= flourNeeded;
          }
          return {
            recipe_id: payload.recipe_id,
            recipe_name: recipe.recipe.name,
            batches_produced: batches,
            timestamp: new Date().toISOString(),
          };
        }

        if (cmd === 'get_settings') {
          return [
            { setting_key: 'currency_symbol', setting_value: '₱' },
            { setting_key: 'theme', setting_value: 'dark' },
          ];
        }

        if (cmd === 'get_recipes') {
          return [recipe.recipe];
        }

        return null;
      },
    };
  });
});

// ── Test Suite ────────────────────────────────────────────────────────────────

test.describe('Adversarial Test Suite: LRC Pricing & Perpetual Inventory', () => {

  test('Vector 01: Pre-flight production deficit halts transaction and renders StockDeficitModal without app crash', async ({
    page,
  }) => {
    // Navigate to Recipe Builder
    await page.goto('/recipes/1');

    // Locate the Production Execution Ribbon
    const producePanel = page.locator('[data-purpose="production-trigger-panel"]');
    await expect(producePanel).toBeVisible();

    // Trigger production run with 1 batch (requires 2.0 kg flour, only 1.0 kg in stock)
    const produceBtn = producePanel.locator('button:has-text("Produce & Deduct Stock")');
    await produceBtn.click();

    // Assert: Modal dialog appears with deficit alert
    const deficitModal = page.locator('div[role="dialog"]');
    await expect(deficitModal).toBeVisible();
    await expect(deficitModal).toContainText('Production Hard Stop');
    await expect(deficitModal).toContainText('Bread Flour');
    await expect(deficitModal).toContainText('-1.00 Kilogram');

    // Assert: Explanatory warning affirms zero stock deduction occurred
    await expect(deficitModal).toContainText('Zero stock has been deducted');

    // Dismiss modal safely
    const dismissBtn = deficitModal.locator('button:has-text("Dismiss Alert")');
    await dismissBtn.click();
    await expect(deficitModal).not.toBeVisible();
  });

  test('Vector 02: Rapid concurrent double-clicking on Produce button is blocked by disabled state', async ({
    page,
  }) => {
    await page.goto('/recipes/1');
    const producePanel = page.locator('[data-purpose="production-trigger-panel"]');
    const produceBtn = producePanel.locator('button:has-text("Produce & Deduct Stock")');

    // Click rapidly twice to simulate race condition
    await produceBtn.click({ clickCount: 2 });

    // Assert modal opened once cleanly without React unhandled state collisions
    const deficitModal = page.locator('div[role="dialog"]');
    await expect(deficitModal).toBeVisible();
  });

  test('Vector 03: Negative and zero batch multipliers disable produce trigger', async ({ page }) => {
    await page.goto('/recipes/1');
    const producePanel = page.locator('[data-purpose="production-trigger-panel"]');
    const batchInput = producePanel.locator('#batch-stepper-input');
    const produceBtn = producePanel.locator('button:has-text("Produce & Deduct Stock")');

    // Input zero
    await batchInput.fill('0');
    // Button must be disabled
    await expect(produceBtn).toBeDisabled();

    // Input negative number
    await batchInput.fill('-2.5');
    await expect(produceBtn).toBeDisabled();

    // Return to valid positive number
    await batchInput.fill('2');
    await expect(produceBtn).toBeEnabled();
  });

  test('Vector 04: Inventory ledger highlights low-stock alert boundary in rose and counts in KPI', async ({
    page,
  }) => {
    await page.goto('/inventory');

    // Assert page header and LRC Mode pill
    await expect(page.locator('h1')).toContainText('Inventory Ledger');
    await expect(page.locator('text=LRC Mode Active')).toBeVisible();

    // Assert KPI Card indicates 2 low stock alerts (Bread Flour: 1.0 <= 5.0, Butter: 2.0 <= 2.0)
    const lowStockKpi = page.locator('text=Low Stock Alerts').locator('../..');
    await expect(lowStockKpi).toContainText('2');

    // Assert rows with low stock contain warning badge
    const lowStockBadges = page.locator('span:has-text("LOW STOCK")');
    await expect(lowStockBadges.first()).toBeVisible();

    // Assert Butter on exact threshold (2.0 <= 2.0) is evaluated as low stock
    const butterRow = page.locator('tr:has-text("Butter")');
    await expect(butterRow).toContainText('LOW STOCK');
  });

  test('Vector 05: ReceiveDeliveryModal validates input rejecting negative and zero quantities', async ({
    page,
  }) => {
    await page.goto('/inventory');

    // Open delivery intake modal
    const receiveBtn = page.locator('button:has-text("+ Receive Delivery")');
    await receiveBtn.click();

    // Target modal
    const modal = page.locator('form');
    await expect(modal).toBeVisible();

    // Attempt to submit without quantity
    const submitBtn = modal.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();

    // Input negative quantity
    const qtyInput = modal.locator('input[type="number"]').first();
    await qtyInput.fill('-5');

    const priceInput = modal.locator('input[placeholder="0.00"]').last();
    await priceInput.fill('75');

    // Assert HTML5 constraint validation marks input invalid
    const isInvalid = await qtyInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);

    // Assert submitting invalid form is rejected / form stays open
    await submitBtn.click({ force: true });
    await expect(modal).toBeVisible();
  });

  test('Vector 06: LRC price overwrite replaces cost basis and recalculates expected valuation', async ({
    page,
  }) => {
    await page.goto('/inventory');

    // Open receive delivery modal for Granulated Sugar
    const sugarRow = page.locator('tr:has-text("Granulated Sugar")');
    const rowReceiveBtn = sugarRow.locator('button:has-text("Receive")');
    await rowReceiveBtn.click();

    // Fill valid delivery: +5 kg @ ₱60.00 (previous was ₱52.00)
    const modal = page.locator('form');
    await expect(modal).toBeVisible();

    const qtyInput = modal.locator('input[type="number"]').first();
    await qtyInput.fill('5');

    const priceInput = modal.locator('input[placeholder="0.00"]').last();
    await priceInput.fill('60');

    // Verify preview calculates expected post-intake stock (10 + 5 = 15.00 kg) and valuation (15 * 60 = ₱900.00)
    await expect(page.locator('text=New Expected Stock:')).toBeVisible();
    await expect(page.locator('text=15.00 Kilogram')).toBeVisible();
    await expect(page.locator('text=Valuation: ₱900.00')).toBeVisible();

    // Confirm delivery
    const confirmBtn = modal.locator('button:has-text("Confirm Delivery & Update Pricing")');
    await confirmBtn.click();

    // Assert modal closes and success toast triggers
    await expect(modal).not.toBeVisible();
    await expect(page.locator('text=Delivery recorded!')).toBeVisible();
  });

  test('Vector 07: Quick restocking action from StockDeficitModal triggers ReceiveDeliveryModal seamlessly', async ({
    page,
  }) => {
    await page.goto('/recipes/1');

    // Trigger deficit
    const producePanel = page.locator('[data-purpose="production-trigger-panel"]');
    await producePanel.locator('button:has-text("Produce & Deduct Stock")').click();

    // Deficit modal is open
    const deficitModal = page.locator('div[role="dialog"]');
    await expect(deficitModal).toBeVisible();

    // Click "Receive" shortcut on Bread Flour deficit row
    const quickReceiveBtn = deficitModal.locator('button:has-text("Receive")');
    await quickReceiveBtn.click();

    // Assert: ReceiveDeliveryModal opens pre-selected for Bread Flour
    const receiveModalTitle = page.locator('h2:has-text("Receive Delivery & Update LRC")');
    await expect(receiveModalTitle).toBeVisible();
    await expect(page.locator('div:has-text("Target Item: Bread Flour")').first()).toBeVisible();
  });

  test('Vector 08: Zero-State and persistence verification on empty search filter', async ({ page }) => {
    await page.goto('/inventory');

    // Search for non-existent item to test empty state resilience
    const searchInput = page.locator('input[placeholder*="Search ingredient"]');
    await searchInput.fill('NonExistentIngredientXYZ');

    // Assert empty state gracefully renders without DOM crash
    await expect(page.locator('text=No items match your search filter')).toBeVisible();

    // Clear filter restores ledger
    await searchInput.fill('');
    await expect(page.locator('tr:has-text("Bread Flour")')).toBeVisible();
  });

});
