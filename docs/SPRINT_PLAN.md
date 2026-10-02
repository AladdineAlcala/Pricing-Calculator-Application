# Sprint Plan: RecipeBuilder Consolidated Direct Materials Display

**Lead Architect**: `/solution-architect-business-planner`  
**Assigned Builder**: `/frontend-uiux-design-expert`  
**QA Specialist**: `qa-automation-tester`  
**Quality Gatekeeper**: `code-reviewer`  
**Sprint Status**: `[COMPLETED & APPROVED]` ✅  

---

## 1. Executive Summary & Domain Costing Rationale

In culinary manufacturing and managerial accounting, total product cost is composed of two primary pillars:
1. **Direct Materials (Prime Variable Cost)**:
   - **Raw Ingredients Cost**: Direct culinary consumption (flour, butter, sugar, eggs, yeast).
   - **Packaging & Presentation Cost**: Direct containerization and finishing materials (boxes, cake boards, liners, ribbons, brand stickers).
2. **Production Overheads (Fixed Cost)**:
   - **Labor Allocation**: Direct baking and assembly labor wage per batch.
   - **Electricity / Gas**: Oven run-time and baking utility energy per batch.

Currently, `RecipeBuilder` displays Raw Ingredients and Packaging & Materials in separate tables and separate lines in the sidebar, but lacks a synthesized **Total Direct Materials** metric. 

Per user instruction, this sprint implements the display of the **Total Direct Materials (Raw Ingredients + Packaging & Materials)** in two complementary, high-visibility locations on the RecipeBuilder screen:
1. **Pricing & Margin Engine Card (Right Sidebar)**: An integrated subtotal block immediately following Raw Ingredients and Packaging, displaying the combined batch direct material cost and per-unit direct material cost before overhead.
2. **Consolidated Direct Materials Summary Card (Left Column)**: A dedicated, executive summary card positioned directly below the Recipe Packaging table that bridges the Ingredients and Packaging modules with a dual-ratio breakdown bar and per-unit unit economics.

---

## 2. Mathematical Formulations & Data Contracts

### 2.1 Formula Definitions
$$\text{Raw Ingredients Cost} = \text{result.total\_ingredient\_cost} \lor \text{result.total\_variable\_cost}$$
$$\text{Packaging Cost} = \text{result.total\_packaging\_cost} \lor 0.0$$
$$\mathbf{\text{Total Direct Materials (Batch)}} = \text{Raw Ingredients Cost} + \text{Packaging Cost}$$
$$\mathbf{\text{Direct Materials Cost Per Unit}} = \frac{\text{Total Direct Materials}}{\text{yield\_qty}}$$

### 2.2 Proportional Ratio Breakdown
$$\text{Ingredients Ratio (\%)} = \text{Total Direct Materials} > 0 \ ? \ \left( \frac{\text{Raw Ingredients Cost}}{\text{Total Direct Materials}} \times 100 \right) : 0$$
$$\text{Packaging Ratio (\%)} = \text{Total Direct Materials} > 0 \ ? \ (100 - \text{Ingredients Ratio (\%)}) : 0$$

---

## 3. Work Breakdown Structure (DAG WBS)

```
[Phase 1: Domain Modeling & Formula Verification] ─────────► [DONE]
                      │
                      ▼
[Phase 2: UI/UX Implementation] (Assigned to /frontend-uiux-design-expert)
  ├── Task 2.1: RecipeBuilder.tsx (Pricing & Margin Engine Card)
  │     ├── Calculate totalDirectMaterials and directMaterialsPerUnit
  │     └── Author integrated "Total Direct Materials" subtotal row with per-unit callout
  └── Task 2.2: RecipeBuilder.tsx (Consolidated Direct Materials Card)
        ├── Position directly below Recipe Packaging table
        ├── Render 3-column financial card: Ingredients Subtotal, Packaging Subtotal, and Combined Materials Total
        └── Render dual-ratio proportional bar (Emerald = Ingredients, Amber = Packaging)
                      │
                      ▼
[Phase 3: Automated Verification] (Assigned to qa-automation-tester)
  ├── Task 3.1: TypeScript compilation & Vite bundle build (`npm run build`)
  └── Task 3.2: Full Playwright E2E test suite (21/21 tests)
                      │
                      ▼
[Phase 4: Quality Gatekeeper Review] (Assigned to code-reviewer)
  └── Task 4.1: Verify zero debug remnants, zero build warnings, clean presentational diff, update .review_strikes.log
```

---

## 4. Targeted File Modifications & Visual Specifications

### Target File: `pricing-calculator/src/pages/RecipeBuilder.tsx`

#### 1. In `Pricing & Margin Engine` Card (Sidebar, lines ~1445–1475):
- Compute:
  ```ts
  const totalDirectMaterials = (result.total_ingredient_cost ?? result.total_variable_cost) + (result.total_packaging_cost || 0);
  const directMaterialsPerUnit = r.yield_qty > 0 ? totalDirectMaterials / r.yield_qty : 0;
  ```
- Insert a highlighted subtotal box directly below the `Packaging & Materials:` row:
  - Label: `Total Direct Materials:`
  - Icon: `PackageCheck`
  - Values: `fmt(totalDirectMaterials)` and `fmt(directMaterialsPerUnit)/unit`
  - Visual treatment: Rounded container with subtle emerald/slate translucent background (`bg-slate-50/80 dark:bg-[#121826]/80 border border-slate-200/70 dark:border-slate-800/70`).

#### 2. Below `Recipe Packaging & Presentation` Card (Left Column, lines ~1315):
- Insert a dedicated **Consolidated Direct Materials Summary Card**:
  - Header:
    - Icon: `PackageCheck` in emerald pill
    - Title: `Total Direct Materials`
    - Subtitle: `Consolidated Raw Ingredients & Packaging Cost`
    - Badge: `{fmt(directMaterialsPerUnit)} / Finished Unit`
  - 3-Column Metric Grid:
    - Box 1: **Raw Ingredients Subtotal** (`fmt(...)`, item count badge, emerald dot)
    - Box 2: **Packaging & Materials Subtotal** (`fmt(...)`, item count badge, amber dot)
    - Box 3: **Total Direct Materials** (`fmt(...)`, prominent emerald tabular typography)
  - Visual Proportional Ratio Bar:
    - Emerald segment: `{ingRatio}% Ingredients`
    - Amber segment: `{pkgRatio}% Packaging`
  - Tooltip / helper note explaining standard culinary prime cost allocation.

---

## 5. Verification Protocol

1. **Static Analysis & Type Gate**:
   - `npm run build`: Must compile cleanly with 0 TypeScript errors and 0 Vite warnings.
2. **Playwright E2E Regression**:
   - Run `npx playwright test` across all 5 test files (`base_unit_conversion_engine`, `ingredients_supplier_sku`, `lrc_perpetual_inventory`, `packaging_management_adversarial`, `recipes_pagination`).
   - All 21 tests must pass cleanly.
3. **Visual Confirmation**:
   - Verify that the combined total is reactive and recalculates instantly when ingredients or packaging are added/removed/updated.
   - Verify seamless appearance in both light and dark mode.

---

## 6. Rollback & Anti-Failure Safety Measures

If aborted or reverted:
- Command: `git restore pricing-calculator/src/pages/RecipeBuilder.tsx`.
