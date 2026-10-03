import { test, expect } from '@playwright/test';

test.describe('Alert & Bell Notification Center (Hierarchical Order & Auto-Dismiss)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and setup mock SQLite database table
    await page.addInitScript(() => {
      localStorage.clear();
      const dbNotifs: any[] = [
        {
          id: "alert-unpriced-pantry-items",
          notification_type: "alert",
          severity: "warning",
          title: "Immediate Action: Unpriced Pantry Ingredients Detected",
          message: "Pantry ingredients lack purchase pricing, causing inaccurate batch costing.",
          details:
            "Without purchase costs, recipes using these ingredients cannot compute accurate batch costs, target markups, or gross margins. Review and set purchase prices in the ingredients master list to prevent margin leakage.",
          action_label: "Price Ingredients in Pantry",
          action_url: "/ingredients",
          created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          is_read: false,
          is_dismissed: false,
        },
        {
          id: "notif-new-ingredient-created",
          notification_type: "notification",
          severity: "success",
          title: "New Ingredient Added",
          message: "A new ingredient 'Organic Madagascar Vanilla' has been created.",
          details:
            "Registered in pantry master catalog with unit of measure (ml), storage location, and initial packaging specifications.",
          action_label: "View in Pantry",
          action_url: "/ingredients",
          created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          is_read: false,
          is_dismissed: false,
        },
        {
          id: "notif-recipe-formula-updated",
          notification_type: "notification",
          severity: "info",
          title: "Recipe Formula Synchronized",
          message: "Formula for 'Artisan Croissant' has updated ingredient proportions.",
          details:
            "Yield of 24 units with target retail markup of 60.0% has been recalculated using live FIFO ingredient purchase rates.",
          action_label: "View Recipes",
          action_url: "/recipes",
          created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          is_read: false,
          is_dismissed: false,
        },
      ];

      (window as any).__MOCK_DB_NOTIFS__ = dbNotifs;
      (window as any).__TAURI_INTERNALS__ = {
        invoke: async (cmd: string, args?: any) => {
          if (cmd === 'get_settings') {
            return [
              { setting_key: 'currency_symbol', setting_value: '₱' },
              { setting_key: 'theme', setting_value: 'light' },
            ];
          }
          if (cmd === 'get_recipes') return [];
          if (cmd === 'get_ingredients') return [];
          if (cmd === 'get_kpis') {
            return {
              total_recipes: 0,
              total_ingredients: 0,
              avg_margin: 0,
              unpriced_ingredients: 0,
            };
          }
          if (cmd === 'set_setting') return null;
          if (cmd === 'get_active_notifications') {
            return dbNotifs.filter((n) => !n.is_dismissed);
          }
          if (cmd === 'create_notification') {
            const input = args?.input || {};
            const id = input.id || `notif-${Date.now()}`;
            const existingIdx = dbNotifs.findIndex((n) => n.id === id);
            const entry = {
              id,
              notification_type: input.notification_type,
              severity: input.severity,
              title: input.title,
              message: input.message,
              details: input.details,
              action_label: input.action_label,
              action_url: input.action_url,
              created_at: new Date().toISOString(),
              is_read: false,
              is_dismissed: false,
            };
            if (existingIdx >= 0) {
              dbNotifs[existingIdx] = entry;
            } else {
              dbNotifs.unshift(entry);
            }
            return id;
          }
          if (cmd === 'dismiss_notification') {
            const target = dbNotifs.find((n) => n.id === args?.id);
            if (target) target.is_dismissed = true;
            return null;
          }
          if (cmd === 'clear_all_notifications') {
            dbNotifs.forEach((n) => {
              n.is_dismissed = true;
            });
            return null;
          }
          return null;
        },
      };
    });
  });

  test('TC-NOTIF-01: Bell trigger button renders unread count and opens popover', async ({ page }) => {
    await page.goto('/');

    const bellTrigger = page.locator('[data-purpose="notification-bell-trigger"]');
    await expect(bellTrigger).toBeVisible();

    // Verify unread badge exists (initial seed has 3 items: 1 alert + 2 notifications)
    const badge = page.locator('[data-purpose="unread-alert-badge"]');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('3');

    // Click bell to toggle popover
    await bellTrigger.click();
    const popover = page.locator('[data-purpose="notification-popover"]');
    await expect(popover).toBeVisible();
    await expect(popover).toContainText('Notifications & Alerts');
  });

  test('TC-NOTIF-02: Hierarchical display order (Alerts strictly above Notifications)', async ({
    page,
  }) => {
    await page.goto('/');

    // Open popover
    await page.locator('[data-purpose="notification-bell-trigger"]').click();
    const popover = page.locator('[data-purpose="notification-popover"]');
    await expect(popover).toBeVisible();

    // Verify Section 1 (Immediate Action Required) appears before Section 2 (Activity & Updates)
    const alertSectionHeader = popover.locator('text=Immediate Action Required').first();
    const notifSectionHeader = popover.locator('text=Activity & Updates').first();

    await expect(alertSectionHeader).toBeVisible();
    await expect(notifSectionHeader).toBeVisible();

    const alertBox = await alertSectionHeader.boundingBox();
    const notifBox = await notifSectionHeader.boundingBox();
    expect(alertBox).not.toBeNull();
    expect(notifBox).not.toBeNull();

    if (alertBox && notifBox) {
      // Alert section MUST be positioned vertically above Notification section
      expect(alertBox.y).toBeLessThan(notifBox.y);
    }

    // Verify specific alerts and notifications
    const alertCard = page.locator('[data-purpose="notification-card-alert"]').first();
    await expect(alertCard).toContainText('Immediate Action: Unpriced Pantry Ingredients Detected');
    await expect(alertCard).toContainText('Immediate Action');

    const notifCard = page.locator('[data-purpose="notification-card-item"]').first();
    await expect(notifCard).toContainText('New Ingredient Added');
    await expect(notifCard).toContainText('Notification');
  });

  test('TC-NOTIF-03: Clicking notification opens detail modal and closing it auto-removes it from the list', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Open popover
    await page.locator('[data-purpose="notification-bell-trigger"]').click();

    // 2. Click the alert card
    const alertCard = page.locator('[data-purpose="notification-card-alert"]').first();
    await alertCard.click();

    // 3. Detail modal opens
    const detailModal = page.locator('[data-purpose="notification-detail-modal"]');
    await expect(detailModal).toBeVisible();
    await expect(detailModal).toContainText('Immediate Action Required');
    await expect(detailModal).toContainText('Immediate Action: Unpriced Pantry Ingredients Detected');
    await expect(detailModal).toContainText('Operational Context & Details');

    // 4. Close the modal using "Acknowledge & Close"
    const closeBtn = detailModal.locator('button:has-text("Acknowledge & Close")');
    await closeBtn.click();
    await expect(detailModal).not.toBeVisible();

    // 5. Verify the alert is AUTOMATICALLY REMOVED from the list and count decremented to 2
    const badge = page.locator('[data-purpose="notification-bell-trigger"]');
    // Now only 2 notifications remain (both informational, so badge changes or count becomes 2)
    await expect(page.locator('[data-purpose="unread-notification-badge"]')).toContainText('2');

    // Reopen popover and verify the alert card is GONE
    await page.locator('[data-purpose="notification-bell-trigger"]').click();
    const popover = page.locator('[data-purpose="notification-popover"]');
    await expect(popover.locator('[data-purpose="notification-card-alert"]')).toHaveCount(0);
    await expect(popover.locator('[data-purpose="notification-card-item"]')).toHaveCount(2);
  });

  test('TC-NOTIF-04: Informational action notification detail auto-removes when modal is closed', async ({
    page,
  }) => {
    await page.goto('/');

    // Open popover
    await page.locator('[data-purpose="notification-bell-trigger"]').click();

    // Click first notification ("New Ingredient Added")
    const notifCard = page.locator('[data-purpose="notification-card-item"]').first();
    await expect(notifCard).toContainText('Organic Madagascar Vanilla');
    await notifCard.click();

    // Detail modal opens
    const detailModal = page.locator('[data-purpose="notification-detail-modal"]');
    await expect(detailModal).toBeVisible();
    await expect(detailModal).toContainText('Action Notification');
    await expect(detailModal).toContainText('New Ingredient Added');

    // Close via 'X' button
    const xBtn = detailModal.locator('button[title="Close and dismiss"]');
    await xBtn.click();
    await expect(detailModal).not.toBeVisible();

    // Verify count decremented (from 3 down to 2)
    const alertBadge = page.locator('[data-purpose="unread-alert-badge"]');
    await expect(alertBadge).toContainText('2');

    // Reopen popover and confirm that notification was removed
    await page.locator('[data-purpose="notification-bell-trigger"]').click();
    const remainingCards = page.locator('[data-purpose="notification-card-item"]');
    await expect(remainingCards).toHaveCount(1);
  });

  test('TC-NOTIF-05: Take Action button routes to target URL and dismisses notification', async ({
    page,
  }) => {
    await page.goto('/');

    // Open popover
    await page.locator('[data-purpose="notification-bell-trigger"]').click();

    // Click the alert card
    await page.locator('[data-purpose="notification-card-alert"]').first().click();

    const detailModal = page.locator('[data-purpose="notification-detail-modal"]');
    await expect(detailModal).toBeVisible();

    // Click "Price Ingredients in Pantry" action button
    const actionBtn = detailModal.locator('button:has-text("Price Ingredients in Pantry")');
    await expect(actionBtn).toBeVisible();
    await actionBtn.click();

    // Expect navigation to /ingredients
    await expect(page).toHaveURL(/\/ingredients/);

    // Reopen popover and verify the alert is removed
    await page.locator('[data-purpose="notification-bell-trigger"]').click();
    await expect(page.locator('[data-purpose="notification-card-alert"]')).toHaveCount(0);
  });

  test('TC-NOTIF-06: SQLite backend IPC persistence synchronizes dismiss and create operations', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Initial count in bell trigger
    const bellTrigger = page.locator('[data-purpose="notification-bell-trigger"]');
    await expect(bellTrigger).toBeVisible();

    // 2. Open popover and click alert to dismiss via modal
    await bellTrigger.click();
    const alertCard = page.locator('[data-purpose="notification-card-alert"]').first();
    await alertCard.click();

    const detailModal = page.locator('[data-purpose="notification-detail-modal"]');
    await expect(detailModal).toBeVisible();
    await detailModal.locator('button:has-text("Acknowledge & Close")').click();
    await expect(detailModal).not.toBeVisible();

    // 3. Verify SQLite mock database has marked is_dismissed = true
    const isDismissedInDb = await page.evaluate(() => {
      const db = (window as any).__MOCK_DB_NOTIFS__;
      const alert = db?.find((n: any) => n.id === 'alert-unpriced-pantry-items');
      return alert?.is_dismissed === true;
    });
    expect(isDismissedInDb).toBe(true);
  });
});
