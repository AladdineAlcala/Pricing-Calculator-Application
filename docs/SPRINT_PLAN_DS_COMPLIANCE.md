# BakeIQ Design System Compliance Sprint Plan
**Sprint ID:** DS-COMPLIANCE-001
**Initiative:** Resolve All BakeIQ Design System Non-Compliance Issues
**Authored by:** /solution-architect-business-planner
**Triggered by:** /frontend-uiux-design-expert Screen Audit (Audit Date: 2026-10-03)
**Audit Result:** 44.3% overall compliance — Target >95% compliance
**Assigned Builder:** /frontend-uiux-design-expert
**Sprint Status:** Pending Execution Confirmation

---

## 1. Executive Problem Summary

The /frontend-uiux-design-expert audit of 6 screens and 7 shared components identified 3 compliance tiers of failures across the BakeIQ Design System v2 (Code-Verified). The root cause is a legacy "Artisan" token namespace (artisan-border, artisan-subtle, artisan-canvas) that was never migrated to the authoritative stoneBorder, flour-*, and espresso-* token set. This created cascading violations across every page and shared component.

### Violation Count by File (Live scan via Select-String)

| File | Token Violations | Priority |
|---|---|---|
| RecipeBuilder.tsx | 237 | P0 Critical |
| Ingredients.tsx | 221 | P0 Critical |
| Recipes.tsx | 178 | P0 Critical |
| Dashboard.tsx | 70 | P0 High |
| Inventory.tsx | 60 | P1 High |
| Footer.tsx | 41 | P2 Medium |
| ReceiveDeliveryModal.tsx | 28 | P1 Medium |
| AddPackagingModal.tsx | 20 | P1 Medium |
| ReceivePackagingModal.tsx | 19 | P1 Medium |
| Settings.tsx | 19 | P1 Medium |
| NotificationCenter.tsx | 18 | P1 Medium |
| ui.tsx | 16 | P0 Root Cause |
| Sidebar.tsx | 14 | P2 Medium |
| Header.tsx | 12 | P2 Medium |
| NotificationDetailModal.tsx | 11 | P1 Medium |
| StockDeficitModal.tsx | 10 | P1 Low |
| ProductionTriggerPanel.tsx | 6 | P2 Low |
| BakeIQLogo.tsx | 1 | P3 Trivial |

**Total detected violations: ~1,031 across 18 files.**

---

## 2. Non-Compliance Classification

### 2.1 Category A - Color Token Drift (Critical)

| Illegal Token | Correct Replacement | Rule |
|---|---|---|
| border-artisan-border | border-stoneBorder | s1.1 Border |
| bg-artisan-surface | bg-white (cards) / bg-flour-100 (pages) | s1.1 Flour / s2.1 |
| bg-artisan-subtle | hover:bg-flour-100 | s2.2 Sidebar |
| bg-artisan-canvas | bg-flour-100 | s2.1 Page Shell |
| text-slate-900 | text-espresso-800 | s1.1 Espresso |
| text-slate-500 / text-slate-600 | text-espresso-600 | s1.1 Espresso |
| text-slate-400 | text-espresso-500 | s1.1 Espresso |
| border-slate-200 / border-slate-100 | border-stoneBorder | s1.1 Border |
| bg-emerald-600 | bg-culinary-600 | s1.1 Culinary |

### 2.2 Category B - Core Token Values Drift (Critical)

index.css @theme block contains incorrect hex values:

| Token | Current Hex | Correct Hex (v2 Spec) |
|---|---|---|
| --color-espresso-900 | #1A120B | #140E0A |
| --color-espresso-800 | #2D1F15 | #1E1510 |
| --color-espresso-700 | #433022 | #2A1F18 |
| --color-espresso-600 | #634835 | #3D2F26 |
| Missing | - | --color-flour-50: #FDFCFB |
| Missing | - | --color-flour-100: #FBF9F5 |
| Missing | - | --color-flour-200: #F5F1EA |
| Missing | - | --color-flour-300: #EAE3D6 |
| Missing | - | --color-flour-400: #D9D0C1 |
| Missing | - | --color-stoneBorder: #E6DFD5 |
| Missing | - | --color-caramel-400: #FBBF24 |
| Missing | - | --color-culinary-400: #4ADE80 |

### 2.3 Category C - Component Primitive Defects (High)

| Component | Property | Current | Correct |
|---|---|---|---|
| Card | border radius | rounded-xl (12px) | rounded-2xl (16px) |
| Card | border token | border-artisan-border | border-stoneBorder |
| Card | background | bg-artisan-surface | bg-white |
| Card | shadow | shadow-artisan-card | shadow-sm |
| Input | border radius | rounded-xl (12px) | rounded-lg (8px) |
| Input | border token | border-artisan-border | border-stoneBorder |
| Input | focus ring | focus:border-culinary-500 focus:ring-4 | focus:border-culinary-600 focus:ring-1 |
| Badge | shape | rounded-md | rounded-full |
| Badge | text size | text-xs | text-[10px] |
| Badge | font | (missing) | font-mono font-semibold |

### 2.4 Category D - Numeric Typography Non-Compliance (High)

All financial, yield, pricing, and overhead figures must use font-mono tabular-nums. Missing in:
- Dashboard.tsx: KPI metrics (margin %, revenue figures)
- Ingredients.tsx: Unit costs, price per unit
- Recipes.tsx: Cost, markup %, margin % per recipe card
- RecipeBuilder.tsx: Ingredient quantities, sub-totals, overhead allocation values
- Inventory.tsx: text-right missing on numeric table columns

### 2.5 Category E - Shell Component Failures (Medium)

| Component | Failure | Fix |
|---|---|---|
| Sidebar.tsx | Nav container padding p-3 | Must be p-5 |
| Sidebar.tsx | Active item missing rounded-xl + shadow-culinary-600/20 | Full active spec |
| Sidebar.tsx | Inactive hover uses bg-artisan-subtle | hover:bg-flour-100 hover:text-espresso-800 |
| Header.tsx | Background bg-artisan-surface/95 and z-20 | bg-flour-100/90 backdrop-blur-md border-b border-stoneBorder z-50 |
| Header.tsx | CTA shadow uses shadow-artisan-glow | shadow-sm |
| Footer.tsx | Light surface bg-artisan-surface/95 | bg-espresso-900 border-t border-espresso-800 text-stone-400 |

---

## 3. Work Breakdown Structure (DAG - Topological Order)

```
[WBS-01] Fix index.css @theme Token Values
    |
    v
[WBS-02] Fix ui.tsx Shared Component Primitives (Card, Input, Badge)
    |
    +--------------------------------+
    v                                v
[WBS-03A] Fix Shell Components  [WBS-03B] Fix Page-Level Color Token Drift
  Sidebar, Header, Footer          Dashboard, Ingredients, Inventory,
                                   RecipeBuilder, Recipes, Settings
    |                                |
    +--------------+-----------------+
                   v
       [WBS-04] Fix Modal & Auxiliary Components
       ReceiveDeliveryModal, AddPackagingModal,
       ReceivePackagingModal, NotificationCenter,
       NotificationDetailModal, StockDeficitModal,
       ProductionTriggerPanel, BakeIQLogo
                   |
                   v
       [WBS-05] Enforce Numeric Typography
       font-mono tabular-nums on all financial figures
       text-right on Inventory table numeric columns
                   |
                   v
       [WBS-06] Build Verification Gate
       tsc --noEmit + npm run build + npx vitest run
                   |
                   v
       [WBS-07] Visual Regression Spot-Check
       5 screens x before/after screenshots
```

---

## 4. Detailed Task Specifications

### WBS-01 - Fix index.css Core Token Values
File: src/index.css
Priority: P0 - Must execute FIRST. All downstream changes depend on correct hex values.
Assigned to: /frontend-uiux-design-expert

Changes Required:
1. Correct espresso palette hex values in @theme block:
   - --color-espresso-900: #140E0A
   - --color-espresso-850: #1A120D
   - --color-espresso-800: #1E1510
   - --color-espresso-700: #2A1F18
   - --color-espresso-600: #3D2F26
   - --color-espresso-500: #524135

2. Add missing flour palette tokens:
   - --color-flour-50: #FDFCFB
   - --color-flour-100: #FBF9F5
   - --color-flour-200: #F5F1EA
   - --color-flour-300: #EAE3D6
   - --color-flour-400: #D9D0C1

3. Add missing border token: --color-stoneBorder: #E6DFD5
4. Add missing accent tokens: --color-caramel-400: #FBBF24 and --color-culinary-400: #4ADE80
5. IMPORTANT: Do NOT remove artisan-* tokens until WBS-04 is complete.

Verification: Tailwind compiles without undefined token warnings.

---

### WBS-02 - Fix ui.tsx Shared Component Primitives
File: src/components/ui.tsx
Priority: P0 - Root cause of cascading Card/Input/Badge failures across all screens.
Assigned to: /frontend-uiux-design-expert

Card (Line ~116):
  BEFORE: rounded-xl border border-artisan-border dark:border-slate-800 bg-artisan-surface dark:bg-[#0c101a] text-espresso-900 dark:text-slate-100 shadow-artisan-card
  AFTER:  rounded-2xl border border-stoneBorder bg-white text-espresso-800 shadow-sm

CardHeader (Line ~125):
  BEFORE: px-6 py-4 border-b border-artisan-border dark:border-slate-800
  AFTER:  px-6 py-4 border-b border-stoneBorder

Input field class (Lines ~86-89):
  BEFORE: w-full rounded-xl border border-artisan-border ... focus:border-culinary-500 focus:ring-4 focus:ring-culinary-500/10
  AFTER:  w-full rounded-lg border border-stoneBorder bg-white px-3 py-2 text-sm text-espresso-800 ... focus:border-culinary-600 focus:ring-1 focus:ring-culinary-600

Badge base (Line ~151):
  BEFORE: inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold
  AFTER:  inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold

Badge variants:
  default BEFORE: bg-artisan-subtle ... border border-artisan-border
  default AFTER:  bg-flour-200 text-espresso-700

  success BEFORE: bg-culinary-50 ... text-culinary-700 ... border border-culinary-200
  success AFTER:  bg-emerald-100 text-culinary-700

  warning BEFORE: bg-caramel-50 ... text-caramel-700 ... border border-caramel-200
  warning AFTER:  bg-amber-100 text-caramel-700

Button secondary:
  BEFORE: bg-artisan-surface ... border border-artisan-border
  AFTER:  bg-white border border-stoneBorder text-espresso-700 text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-flour-50 shadow-sm

Button ghost:
  BEFORE: hover:bg-artisan-subtle ... text-espresso-700
  AFTER:  text-culinary-600 hover:underline font-bold

Verification: tsc --noEmit passes. npx vitest run passes.

---

### WBS-03A - Fix Shell Components (Sidebar, Header, Footer)
Files: src/components/Sidebar.tsx, Header.tsx, Footer.tsx
Priority: P2 (after WBS-01 tokens are available)
Assigned to: /frontend-uiux-design-expert

SIDEBAR.TSX changes:
  Line 10 aside bg:           bg-artisan-surface       -> bg-white
  Line 10 border:             border-artisan-border    -> border-stoneBorder/80
  Line 21 nav padding:        p-3                      -> p-5
  Lines 28,63,98,133,168 active state: rounded-lg     -> rounded-xl shadow-sm shadow-culinary-600/20
  Lines 31,66,101,136,171 inactive hover: hover:bg-artisan-subtle -> hover:bg-flour-100 hover:text-espresso-800 transition-colors
  Lines 31,66,101,136,171 inactive text:  text-espresso-700 -> text-espresso-600
  Line 209 sidebar footer border: border-artisan-border -> border-stoneBorder/60

HEADER.TSX changes:
  Background: bg-artisan-surface/95 -> bg-flour-100/90 backdrop-blur-md
  Border:     border-artisan-border -> border-stoneBorder
  z-index:    z-20                  -> z-50
  CTA shadow: shadow-artisan-glow   -> shadow-sm
  CTA radius: rounded-lg            -> rounded-xl

FOOTER.TSX changes (dark surface migration per section-6):
  Line 48 background:    bg-artisan-surface/95     -> bg-espresso-900
  Line 48 border:        border-artisan-border      -> border-espresso-800
  Line 48 text color:    text-espresso-500          -> text-stone-400
  Inner button bg:       bg-artisan-canvas          -> bg-espresso-800
  Inner button border:   border-artisan-border      -> border-espresso-700
  Inner button text:     text-espresso-700          -> text-stone-300

Verification: Visual spot-check in browser at 100% zoom.

---

### WBS-03B - Fix Page-Level Color Token Drift
Files:
  src/pages/RecipeBuilder.tsx (237 violations)
  src/pages/Ingredients.tsx (221 violations)
  src/pages/Recipes.tsx (178 violations)
  src/pages/Dashboard.tsx (70 violations)
  src/pages/Inventory.tsx (60 violations)
  src/pages/Settings.tsx (19 violations)

Priority: P0 for top-3, P1 for rest
Assigned to: /frontend-uiux-design-expert

UNIVERSAL TOKEN REPLACEMENT MAP (apply to all 6 files):

  text-slate-900        -> text-espresso-800
  text-slate-700        -> text-espresso-700
  text-slate-600        -> text-espresso-600
  text-slate-500        -> text-espresso-600
  text-slate-400        -> text-espresso-500
  bg-slate-50           -> bg-flour-100
  bg-slate-100          -> bg-flour-200
  border-slate-100      -> border-stoneBorder
  border-slate-200      -> border-stoneBorder
  bg-artisan-subtle     -> bg-flour-100
  bg-artisan-canvas     -> bg-flour-100
  border-artisan-border -> border-stoneBorder
  bg-emerald-600        -> bg-culinary-600
  rounded-3xl           -> rounded-2xl

PER-PAGE ADDITIONS:

Dashboard.tsx:
  - KPI card big numbers: add font-mono tabular-nums
  - KPI icon badges: verify semantic bg colors (indigo, blue, emerald, amber per s3.3)
  - Main content area: confirm bg-[#F8F9FA]

Ingredients.tsx:
  - price_per_unit display cells: add font-mono tabular-nums
  - Filter/search bar: border-artisan-border -> border-stoneBorder

Inventory.tsx:
  - Numeric columns (Stock Qty, Reorder Floor, LRC Price, Tied Capital): add text-right
  - All price/qty cells: add font-mono tabular-nums

RecipeBuilder.tsx:
  - Ingredient quantity cells: font-mono
  - Sub-total / overhead rows: font-mono tabular-nums
  - Pricing tier cards (Retail, Wholesale, Commercial): font-mono tabular-nums

Recipes.tsx:
  - Recipe card: cost, markup%, margin% -> font-mono tabular-nums
  - Badges: WBS-02 cascade handles font-mono

Settings.tsx:
  - Card/CardHeader: cascade from WBS-02
  - H3 headings: confirm text-espresso-800

Verification: tsc --noEmit + npm run build pass after all 6 files done.

---

### WBS-04 - Fix Modal & Auxiliary Components
Files:
  src/components/ReceiveDeliveryModal.tsx (28)
  src/components/AddPackagingModal.tsx (20)
  src/components/ReceivePackagingModal.tsx (19)
  src/components/NotificationCenter.tsx (18)
  src/components/NotificationDetailModal.tsx (11)
  src/components/StockDeficitModal.tsx (10)
  src/components/ProductionTriggerPanel.tsx (6)
  src/components/BakeIQLogo.tsx (1)

Priority: P1
Assigned to: /frontend-uiux-design-expert

Apply the universal token replacement map from WBS-03B to all 8 files.

Additional specific fixes:
  ProductionTriggerPanel.tsx: border-artisan-border -> border-stoneBorder
  StockDeficitModal.tsx: rounded-2xl already compliant - keep; fix border token only
  NotificationCenter.tsx: fix bg-artisan-* backgrounds + text-slate-* text tokens

After WBS-04 completes, artisan-* token definitions in index.css can be SAFELY REMOVED.

Verification: Each modal renders, opens, and closes without errors. tsc --noEmit passes.

---

### WBS-05 - Enforce Numeric Typography Globally
Priority: P1
Assigned to: /frontend-uiux-design-expert

RULE: All display of the following MUST use font-mono tabular-nums:
  - Currency amounts (PHP symbol, price fields)
  - Percentage values (markup %, margin %, yield %)
  - Quantity values (ingredient qty, batch size, stock counts)
  - KPI card hero numbers
  - All table cells with numeric data

Required additions by screen:
  Dashboard.tsx:       KPI card values (4 cards x 1 hero number each)
  Ingredients.tsx:     price_per_unit display cells
  Recipes.tsx:         Recipe card cost, markup%, margin%
  RecipeBuilder.tsx:   Ingredient rows, overhead rows, all 3 pricing tier values
  Inventory.tsx:       All numeric columns + text-right alignment

Verification: npm run dev -> visually confirm JetBrains Mono renders on all numeric values.

---

### WBS-06 - Build Verification Gate
Assigned to: /frontend-uiux-design-expert

Commands (ALL must exit code 0 before code-reviewer submission):
  npx tsc --noEmit
  npm run build
  npx vitest run

---

### WBS-07 - Visual Regression Spot-Check
Assigned to: /frontend-uiux-design-expert

Capture before/after screenshots for:
  1. Dashboard - KPI cards and page canvas color
  2. Ingredients - Table view with filters visible
  3. RecipeBuilder - Pricing summary panel
  4. Sidebar - Active nav item + inactive hover states
  5. Footer - Confirm dark espresso-900 surface

---

## 5. Data Contracts & Constraints

This is a PURELY PRESENTATIONAL sprint. Zero changes to:
  - Rust backend (src-tauri/src/)
  - SQLite schema (*.sql)
  - TypeScript API layer (lib/api.ts, lib/db.ts)
  - Business calculation logic

No new dependencies required.

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| artisan-* token removal breaks dark mode | High | Medium | Remove only after all 18 files migrated (end of WBS-04) |
| rounded-xl to rounded-2xl on Card disrupts layout | Low | Low | Visual check Card usage at every page |
| Footer dark surface fails WCAG contrast | Low | Medium | Verify text-stone-400 on bg-espresso-900 meets 4.5:1 ratio |
| Mass token replacement introduces regressions | Medium | Medium | Run tsc --noEmit after each WBS task individually |

---

## 7. Acceptance Criteria

All must be satisfied for DS-COMPLIANCE-001 to be marked DONE:

- [ ] AC-01: Violation scan returns 0 matches for artisan-border|artisan-subtle|artisan-canvas|slate-[0-9]|rounded-3xl|bg-emerald-600 across all src/ files.
- [ ] AC-02: Card renders with rounded-2xl border-stoneBorder bg-white shadow-sm on every page.
- [ ] AC-03: Badge renders with rounded-full text-[10px] font-mono font-semibold on every page.
- [ ] AC-04: Input renders with rounded-lg border-stoneBorder focus:ring-1 focus:ring-culinary-600.
- [ ] AC-05: All KPI card numeric values display in JetBrains Mono (font-mono tabular-nums).
- [ ] AC-06: Inventory table numeric columns are right-aligned (text-right).
- [ ] AC-07: Sidebar active nav item has rounded-xl shadow-sm shadow-culinary-600/20.
- [ ] AC-08: Footer renders dark: bg-espresso-900 border-t border-espresso-800 text-stone-400.
- [ ] AC-09: tsc --noEmit exits code 0.
- [ ] AC-10: npm run build exits code 0.
- [ ] AC-11: code-reviewer returns STATUS: APPROVED.

---

## 8. Sprint Execution Order Summary

  WBS-01 -> WBS-02 -> WBS-03A + WBS-03B (parallel) -> WBS-04 -> WBS-05 -> WBS-06 -> WBS-07
  P0(CSS)   P0(ui)        P1/P2 (shell + pages)          P1         P1      gate      gate

Estimated scope: ~1,031 violations across 18 files.
Pure CSS class token replacement - zero logic or data model changes.

---

Plan authored by /solution-architect-business-planner
