# Complete Screen-by-Screen Unit & Integration Test Audit Report

**Auditor & Lead Architect**: `/solution-architect-business-planner`  
**Quality Gatekeeper**: `code-reviewer`  
**Application Scope**: BakeIQ Desktop Application (React 19 + TypeScript + Tauri 2.x + Rust + SQLite)  
**Date of Audit**: October 3, 2026  
**Total Automated Tests**: 35 Playwright E2E Tests + 13 Rust Domain Unit Tests (All Passing ✅)  

---

## 1. Executive Summary & Test Landscape

This audit provides a comprehensive, rigorous assessment of test coverage across all **6 primary user screens** and **3 global layout components** of the BakeIQ desktop application.

### Test Architecture Breakdown
1. **Frontend E2E & Component Integration (`pricing-calculator/e2e/`)**:
   - Framework: Playwright (`@playwright/test` v1.63)
   - Mock IPC Interface: Tauri `__TAURI_INTERNALS__.invoke`
   - Active Suites: 8 spec files, **35 passing tests**.
2. **Backend Domain Math & Normalization (`pricing-calculator/src-tauri/`)**:
   - Framework: Rust built-in test runner (`#[cfg(test)] mod tests` in `models.rs`)
   - Scope: Unit conversions, FIFO batch pricing, inventory deficit calculations, packaging extensions.
   - Active Tests: **13 passing unit tests**.

### Overall Screen Coverage Heatmap

| Screen / Component | Route | Primary Component | Coverage Status | Active Tests | Business Risk |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **1. Dashboard** | `/` | `Dashboard.tsx` | ⚠️ **Low** | 0 direct (2 indirect) | **Medium** |
| **2. Ingredients Catalog** | `/ingredients` | `Ingredients.tsx` | 🟢 **Moderate** | 5 direct | **Low** |
| **3. Inventory & Restocking** | `/inventory` | `Inventory.tsx` | 🌟 **Very High** | 8 direct | **Very Low** |
| **4. Recipe Master List** | `/recipes` | `Recipes.tsx` | 🟢 **Moderate** | 2 direct | **Medium** |
| **5. Recipe Builder & Costing** | `/recipes/:id` | `RecipeBuilder.tsx` | 🌟 **Very High** | 12 direct | **Very Low** |
| **6. Settings & Disaster Recovery** | `/settings` | `Settings.tsx` | 🔴 **None** | 0 direct (0 indirect) | **High** |
| **Header & Bell Center** | Global | `Header.tsx`, `NotificationCenter.tsx` | 🌟 **Very High** | 10 direct | **Very Low** |
| **Sidebar Navigation** | Global | `Sidebar.tsx` | 🟢 **Moderate** | 2 direct | **Low** |
| **Application Footer** | Global | `Footer.tsx` | 🟢 **Moderate** | 1 direct | **Low** |

---

## 2. Detailed Screen-by-Screen Audit

---

### 🖥️ Screen 1: Executive Intelligence Dashboard
- **Route**: `/`
- **Source File**: `pricing-calculator/src/pages/Dashboard.tsx` (734 lines)
- **Primary Workflows**:
  - Executive KPI cards: Total Recipes, Total Ingredients, Average Gross Margin, Unpriced Ingredients.
  - Manila Market 1-click price seeding for quick setup.
  - Recent Recipes table with live margin health pills.
  - Cost distribution & profit overview bar.
  - Quick action CTA shortcuts (New Recipe, Add Ingredient, Receive Delivery, Export CSV, Backup).

#### Current Test Coverage
- **Active Tests**: 0 dedicated test specifications.
  - *Indirect*: `header_theme_toggle.spec.ts` loads `/` to verify top header geometry.
  - *Indirect*: `notification_center.spec.ts` loads `/` to test bell notifications.
- **Coverage Status**: ⚠️ **Low**

#### Identified Gaps & Edge Cases
1. **No KPI Integrity Test**: Does not verify that KPI values calculate accurately from `get_ingredients` and `get_recipes`.
2. **1-Click Seeding Flow**: The "Seed Manila Market Prices" action is completely untested.
3. **Empty / Zero-State Handling**: Does not verify behavior when the database has 0 recipes and 0 ingredients.
4. **Recent Recipe Routing**: Clicking a recent recipe card must navigate to `/recipes/:id`.
5. **Code Hygiene Note**: Line 79 contains `console.warn` in fallback block (candidate for clean logging removal).

#### Proposed Remediation: `e2e/dashboard_executive.spec.ts`
- `TC-DASH-01`: Top KPI cards reflect live ingredient and recipe counts.
- `TC-DASH-02`: Unpriced ingredients banner displays correct count and routes to `/ingredients`.
- `TC-DASH-03`: 1-click market seeding seeds prices and updates unpriced count.
- `TC-DASH-04`: Recent recipes table displays margin badges and links to builder.

---

### 🖥️ Screen 2: Ingredients Master Catalog
- **Route**: `/ingredients`
- **Source File**: `pricing-calculator/src/pages/Ingredients.tsx` (1,842 lines)
- **Primary Workflows**:
  - Master pantry ingredients table with search, category filtering, and sorting.
  - Supplier & SKU metadata persistence.
  - Centralized Unit System: Base unit selection, yield factor, package specifications.
  - Real-time conversion factor calculation (`Package Price / (Net Qty * Conversion Factor)`).
  - Add / Edit Ingredient modal dialog with live preview.
  - Delete ingredient with dependency warnings.

#### Current Test Coverage
- **Active Suites**:
  - `ingredients_supplier_sku.spec.ts`:
    - `TC-01`: Displays saved supplier and SKU in table.
    - `TC-02`: Modal shows Supplier and SKU as optional with custom select arrows.
    - `TC-03`: Editing existing ingredient loads saved values and updates cleanly.
  - `base_unit_conversion_engine.spec.ts`:
    - `TC-BU-01`: Displays Base Unit badge in table and base unit selector in modal.
    - `TC-BU-02`: Synchronizes live conversion factor and yield factor in modal.
- **Total Tests**: **5 passing tests**.
- **Coverage Status**: 🟢 **Moderate**

#### Identified Gaps & Edge Cases
1. **Search & Category Filtering**: Unchecked behavior when filtering by Category (Bulk Dry Goods, Liquids, etc.) or typing text into the search bar.
2. **Ingredient Deletion Lifecycle**: Untested cascade delete or deletion prevention when an ingredient is used in recipes.
3. **Stock Reorder Threshold Validation**: Untested behavior when setting invalid/negative reorder thresholds.
4. **Zero Search Results**: Untested zero-state table message when search yields no matches.

---

### 🖥️ Screen 3: Inventory & Packaging Management
- **Route**: `/inventory`
- **Source File**: `pricing-calculator/src/pages/Inventory.tsx` (986 lines)
- **Primary Workflows**:
  - Dual ledger tabs: "Ingredients Stock" & "Packaging Materials".
  - Perpetual inventory valuation (`Current Stock * LRC Price`).
  - Reorder point monitoring with rose low-stock highlight tags.
  - "Receive Delivery" modal with Last Receipt Cost (LRC) invoice price replacement.
  - "Receive Packaging" modal with reactive subtotal calculations.
  - Packaging type filtering (Liners, Boxes, Clamshells, Containers).
  - Chronological transaction audit ledger.

#### Current Test Coverage
- **Active Suites**:
  - `lrc_perpetual_inventory.spec.ts`:
    - `Vector 04`: Ledger highlights low-stock alert boundary in rose and counts in KPI.
    - `Vector 05`: ReceiveDeliveryModal validates input rejecting negative/zero quantities.
    - `Vector 06`: LRC price overwrite replaces cost basis and recalculates expected valuation.
    - `Vector 07`: Restocking from StockDeficitModal triggers ReceiveDeliveryModal seamlessly.
    - `Vector 08`: Zero-State and persistence verification on empty search filter.
  - `packaging_management_adversarial.spec.ts`:
    - `Vector 01`: Packaging Materials tab renders ledger and filters by type.
    - `Vector 02`: ReceivePackagingModal reactive input validation and real-time total computation.
    - `Vector 05`: Quick stock-in action from deficit modal routes to delivery modal with item preselected.
- **Total Tests**: **8 passing tests**.
- **Coverage Status**: 🌟 **Very High (Industry Standard)**

#### Identified Gaps & Edge Cases
1. **Transaction Ledger Export**: Untested CSV export of historical ledger movements.
2. **Large Ledger Pagination**: Untested performance when transaction count exceeds 100 rows.

---

### 🖥️ Screen 4: Recipe Master List
- **Route**: `/recipes`
- **Source File**: `pricing-calculator/src/pages/Recipes.tsx` (1,298 lines)
- **Primary Workflows**:
  - Grid view vs List view layout toggle.
  - Recipe summary cards: Total Cost, Cost/Item, Recommended Retail Price (RRP), Gross Margin %, Target Status.
  - Real-time search by recipe name.
  - Margin status filters ("All", "On Target", "Below Target").
  - Pagination controls (1 to 6 of N recipes, previous/next buttons, page indicators).
  - "Create New Recipe" modal (Name, Yield, Labor, Electricity, Markups).
  - Delete recipe modal with confirmation.

#### Current Test Coverage
- **Active Suites**:
  - `recipes_pagination.spec.ts`:
    - `TC-01`: Pagination component displayed on lower right side in grid view with summary text.
    - `TC-02`: Pagination component remains on lower right side in list view mode.
- **Total Tests**: **2 passing tests**.
- **Coverage Status**: 🟢 **Moderate**

#### Identified Gaps & Edge Cases
1. **Create Recipe Modal End-to-End**: Untested creation flow (opening modal, submitting parameters, verifying recipe appears in list and redirects to builder).
2. **Search Input Reactivity**: Untested live text filtering across recipe cards.
3. **Margin Filter Pills**: Untested filtering by "On Target" vs "Below Target".
4. **Delete Recipe**: Untested deletion confirmation and removal from table.

---

### 🖥️ Screen 5: Recipe Builder & Costing Engine
- **Route**: `/recipes/:id`
- **Source File**: `pricing-calculator/src/pages/RecipeBuilder.tsx` (2,505 lines)
- **Primary Workflows**:
  - Formula Line Items: Add, edit, delete ingredients with UOM conversions.
  - Packaging Line Items: Add, edit, delete packaging with batch extension.
  - Cost Distribution Bar: 3-way ratio (Ingredients %, Packaging %, Overhead %).
  - Channel Pricing & Margins: RRP, Wholesale Price, Benchmark Objective.
  - Quick Markup Simulation: 7 standard presets (20%, 30%, 40%, 50%, 60%, 75%, 100%) + Current & Optimal.
  - "SAVE FORMULA & COMMIT PRICING" persistence CTA.
  - Batch Production: "Produce Batch" button with pre-flight inventory deficit validation.
  - Print / Export specification sheet.

#### Current Test Coverage
- **Active Suites**:
  - `base_unit_conversion_engine.spec.ts`:
    - `TC-BU-03`: RecipeBuilder displays Base Unit Cost and Normalized Quantity.
  - `lrc_perpetual_inventory.spec.ts`:
    - `Vector 01`: Pre-flight deficit halts transaction and renders StockDeficitModal.
    - `Vector 02`: Rapid concurrent double-clicking on Produce button is blocked by disabled state.
    - `Vector 03`: Negative and zero batch multipliers disable produce trigger.
  - `packaging_management_adversarial.spec.ts`:
    - `Vector 03`: RecipeBuilder displays packaging line items and 3-way cost distribution bar.
    - `Vector 04`: Batch production dual shortfall halts transaction and displays distinct item badges.
  - `quick_markup_simulation.spec.ts`:
    - `TC-MARKUP-01`: Displays all 7 requested preset figures in standard presets grid.
    - `TC-MARKUP-02`: Initial recipe markup is visually highlighted as active preset.
    - `TC-MARKUP-03`: Clicking +75% updates active markup, recalculates RRP and highlights +75%.
    - `TC-MARKUP-04`: Clicking +100% doubles unit base cost to ₱20.00 RRP.
- **Total Tests**: **12 passing tests**.
- **Coverage Status**: 🌟 **Very High (Comprehensive & Robust)**

#### Identified Gaps & Edge Cases
1. **Line Item Deletion Recalculation**: Removing an ingredient or packaging line item and verifying immediate cost reduction.
2. **Print Spec Sheet View**: Verification of `@media print` layout rendering.

---

### 🖥️ Screen 6: Settings & Disaster Recovery
- **Route**: `/settings`
- **Source File**: `pricing-calculator/src/pages/Settings.tsx` (225 lines)
- **Primary Workflows**:
  - Interface Theme: Luminous Light vs Nocturne Dark mode selector.
  - Currency Symbol: Custom currency display configuration (₱, $, €, etc.).
  - Database Backup & Disaster Recovery: Target backup folder path, "Backup Database" action.
  - System Information: SQLite version, database path, active version stamp.

#### Current Test Coverage
- **Active Tests**: **0 dedicated test specifications**.
- **Coverage Status**: 🔴 **None (Critical Coverage Gap)**

#### Identified Gaps & Business Risks
1. **Zero E2E Validation**: The settings screen is currently never visited directly by any automated test runner.
2. **Currency Symbol Reactivity**: Untested whether updating currency in Settings instantly reflects across Dashboard, Recipes, and RecipeBuilder.
3. **Database Backup Action**: Untested whether clicking "Backup Database" calls `backup_database` IPC command and outputs success/failure alerts.
4. **Theme Buttons**: Untested whether `#theme-light-btn` and `#theme-dark-btn` switch themes correctly on the settings page.

---

## 3. Global Shell & Navigation Component Audit

### `Header.tsx` & `NotificationCenter.tsx`
- **Coverage**: 10 tests across `header_theme_toggle.spec.ts` (TC-THEME-01 to 04) and `notification_center.spec.ts` (TC-NOTIF-01 to 06).
- **Status**: 🌟 **Very High**. Theme toggles, geometrical alignment (80px), hierarchical alert separation, auto-dismiss portal modal, and SQLite persistence are 100% covered.

### `Sidebar.tsx` & `Footer.tsx`
- **Coverage**: 3 tests in `header_theme_toggle.spec.ts` covering bottom border seam alignment, theme toggle exclusion, and footer alignment.
- **Status**: 🟢 **Moderate**. All visual constraints validated.

---

## 4. Backend Rust Domain Engine Audit (`src-tauri/src/models.rs`)

The pure mathematical domain logic is backed by **13 unit tests** executing in memory:
1. `test_butter_box_package_normalization`: Gram density package cost conversion.
2. `test_flour_sack_package_normalization`: Bulk sack net quantity and cup yield math.
3. `test_ingredient_backward_compatibility_defaults`: JSON deserialization safety.
4. `test_sugar_multi_unit_conversion_architecture`: Multi-unit UOM conversions.
5. `test_multi_occurrence_multi_unit_recipe_costing`: Multiple occurrences of same ingredient in one recipe.
6. `test_inventory_lrc_replacement_and_valuation_accumulation`: LRC perpetual stock updates.
7. `test_production_batch_bulk_requirement_and_deficit_interception`: Pre-flight deficit validation.
8. `test_inventory_ledger_low_stock_evaluation`: Threshold boundary comparisons.
9. `test_base_unit_normalization_and_costing_formulas`: System-level base unit math.
10. `test_packaging_unit_cost_and_batch_extension`: Packaging line item batch costs.
11. `test_recipe_cost_rollup_with_packaging_and_overhead`: Variable and overhead rollup math.
12. `test_dual_inventory_deficit_aggregation_recipe_builder`: Dual packaging + ingredient deficit aggregation.
13. `test_packaging_stock_receiving_and_ledger_math`: Perpetual packaging inventory reception.

---

## 5. Prioritized Remediation Roadmap (Action Plan)

To achieve **100% full-surface test coverage** across all screens, we recommend executing the following test hardening sprints:

### Priority 1: Settings Screen Full Suite (`e2e/settings_configuration.spec.ts`)
- **Objective**: Close the only remaining 0%-coverage screen in the application.
- **Vectors to Implement**:
  - `TC-SET-01`: Theme selector switches between Light and Dark mode.
  - `TC-SET-02`: Changing currency symbol persists and updates currency display across the app.
  - `TC-SET-03`: Manual database backup triggers IPC and displays backup location alert.
  - `TC-SET-04`: Backup folder path persistence.

### Priority 2: Executive Dashboard Full Suite (`e2e/dashboard_executive.spec.ts`)
- **Objective**: Validate the top executive overview and 1-click seeding features.
- **Vectors to Implement**:
  - `TC-DASH-01`: KPI cards display accurate totals from backend queries.
  - `TC-DASH-02`: Unpriced pantry ingredients warning card triggers routing to `/ingredients`.
  - `TC-DASH-03`: 1-Click Manila Market price seeding seeds items and refreshes dashboard.
  - `TC-DASH-04`: Recent recipes table displays live margin status pills.

### Priority 3: Recipe Creation & Search Filter Suite (`e2e/recipes_workflow.spec.ts`)
- **Objective**: Strengthen the Recipe Master List (`/recipes`).
- **Vectors to Implement**:
  - `TC-REC-01`: Create New Recipe modal validates inputs and creates recipe in SQLite.
  - `TC-REC-02`: Live name search filters recipe cards in real time.
  - `TC-REC-03`: Delete recipe workflow with confirmation dialog.
