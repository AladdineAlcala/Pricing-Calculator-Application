# Sprint Plan: Full BakeIQ Design System Compliance & UI/UX Audit Remediation

**Lead Architect & Orchestrator**: `/solution-architect-business-planner`  
**Assigned UI/UX Specialist**: `/frontend-uiux-design-expert` (Design System Tokens, Typography Hierarchy, Component Modernization, Table Zebra Striping, Responsive Spacing)  
**Assigned Full-Stack Specialist**: `/bakeiq-fullstack-engineer` (Component Refactoring, Unit Testing, IPC Type Symmetry Verification)  
**Assigned QA Specialist**: `qa-automation-tester` (Adversarial E2E Playwright Suite, Regression Testing)  
**Strict Quality Gatekeeper**: `code-reviewer`  
**Sprint Status**: `[AWAITING USER EXECUTION APPROVAL] ⏳`  

---

## 1. Executive Summary & Problem Formulation

Based on the [BakeIQ Screen Audit Report](file:///d:/source/repos/Pricing%20Calculator%20Application/docs/SCREEN_AUDIT_REPORT.md) and the [Screen Audit Checklist](file:///d:/source/repos/Pricing%20Calculator%20Application/.vscode/files/ScreenAuditChecklist.md), the application currently scores **56.9%** compliance against the official "Artisan + Quantitative" Design System.

### Primary Deviations to Resolve
1. **Color Token Drift**: CTAs default to green (`bg-culinary-600` / `bg-emerald-600`) instead of Roasted Caramel (`#D97A34`). Canvas uses `#FAF8F5` instead of `#F9F8F6`. Dark elements use `#1A120B` / `text-slate-900` instead of Roasted Espresso (`#0F0F0F`). Borders use inconsistent slate/artisan tokens instead of Warm Stone (`#E5E3DF`).
2. **App Shell Sidebar**: Hardcoded to 256px (`w-64`) with a white background (`bg-artisan-surface`) instead of the required **240px** dark sidebar (`#0F0F0F`).
3. **Card & Container Radius**: Inconsistent radius throughout the app (`rounded-xl` at 12px or `rounded-3xl` at 24px) instead of the mandated **16px (`rounded-2xl`)**.
4. **Table Formatting**: All tables (`Ingredients`, `Inventory`, `RecipeBuilder`, `Recipes`) lack alternating zebra striping (`#F9F8F6` and `#FFFFFF`) and have row heights below the 48px minimum standard.
5. **Data Typography & Monospace**: Numbers in KPI summary counters and table line costs frequently omit `font-mono`, leading to visual tabular jitter.
6. **Typographic Hierarchy**: H1 titles are undersized (24–30px instead of 48–64px); section headers are undersized (14–16px instead of 32–40px).

---

## 2. Technical Contracts & Design Tokens

### Master Design Tokens (`index.css` & Tailwind)
```css
/* Color Palette */
--color-roasted-espresso: #0F0F0F; /* Primary dark, cards, headers */
--color-artisan-flour:    #F9F8F6; /* Background canvas */
--color-roasted-caramel:  #D97A34; /* Accent CTAs, active states */
--color-alpine-pasture:   #4A7C59; /* Success states, positive trends */
--color-warm-stone:       #E5E3DF; /* 1px borders and dividers */
--color-text-secondary:   #6B6B6B; /* Helper text, metadata */

/* Spacing & Radii */
--radius-card:            16px;   /* rounded-2xl */
--radius-control:         8px;    /* rounded-lg (buttons, inputs) */
--radius-badge:           9999px; /* rounded-full (pills) */

/* Typography */
--font-sans: "Plus Jakarta Sans", system-ui, sans-serif;
--font-mono: "JetBrains Mono", monospace;
```

### Component Standards (`ui.tsx`)
```tsx
// Primary Button
className="bg-[#D97A34] hover:bg-[#c26827] text-white font-bold rounded-lg px-6 py-3 text-sm transition-all shadow-sm active:scale-[0.99] cursor-pointer"

// Secondary Button
className="bg-transparent border border-[#0F0F0F] text-[#0F0F0F] hover:bg-[#0F0F0F]/5 font-bold rounded-lg px-6 py-3 text-sm transition-all active:scale-[0.99] cursor-pointer"

// Form Input
className="w-full bg-white border border-[#E5E3DF] rounded-lg px-3.5 py-2 text-sm text-[#0F0F0F] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#D97A34] transition-all"

// Card Primitive
className="rounded-2xl border border-[#E5E3DF] bg-white text-[#0F0F0F] shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-6"

// Table Zebra Row
className="min-h-[48px] h-12 transition-colors even:bg-[#F9F8F6] odd:bg-white hover:bg-[#D97A34]/5 border-b border-[#E5E3DF]"
```

---

## 3. Work Breakdown Structure (DAG WBS)

```
[Wave 1: Core Design System Tokens & Primitives] (Assigned to /frontend-uiux-design-expert)
  ├── Task 1.1: Update `index.css` theme variables to exact hex palette (#0F0F0F, #F9F8F6, #D97A34, #4A7C59, #E5E3DF, #6B6B6B)
  ├── Task 1.2: Standardize `ui.tsx` primitives (Card = 16px radius, Button = 8px radius + #D97A34, Input = 8px radius + #D97A34 focus, Badge = 999px pill)
  ├── Task 1.3: Refactor `Sidebar.tsx` to 240px width (`w-[240px]`), #0F0F0F dark background, light text, and #D97A34 active pill
  └── Task 1.4: Update `App.tsx` canvas wrapper to `bg-[#F9F8F6]`
                │
                ▼
[Wave 2: Screen Modernization & Compliance] (Assigned to /frontend-uiux-design-expert)
  ├── Task 2.1: Modernize `Dashboard.tsx`
  │     ├── Scale H1 to 48px (`text-5xl font-bold tracking-tight text-[#0F0F0F]`)
  │     ├── Upgrade 4 KPI cards to Bento Box structure (Title top, Large Monospace number mid, Trend badge bottom)
  │     ├── Convert KPI cards to 16px radius (`rounded-2xl`) and 24px padding (`p-6`) with `#E5E3DF` borders
  │     └── Update primary CTAs to `#D97A34` with 8px radius
  │
  ├── Task 2.2: Modernize `Ingredients.tsx` & Modals
  │     ├── Convert all `rounded-3xl` containers and modals to 16px (`rounded-2xl`)
  │     ├── Implement table zebra striping (`#F9F8F6` / `#FFFFFF`) and 48px minimum row height
  │     ├── Enforce `font-mono` on supplier prices, unit costs, and yield factors
  │     ├── Update active filter buttons and primary save buttons to `#D97A34`
  │     └── Standardize modal input controls to 8px radius and `#E5E3DF` borders
  │
  ├── Task 2.3: Modernize `Inventory.tsx` & Delivery Modals
  │     ├── Enforce zebra striping and 48px minimum row height across Ingredients & Packaging tables
  │     ├── Upgrade KPI cards to 24px padding (`p-6`) and Bento Box trend indicators
  │     └── Update `+ Receive Delivery` and modal action buttons to `#D97A34` with 8px radius
  │
  ├── Task 2.4: Modernize `RecipeBuilder.tsx` & Calculation Panels
  │     ├── Enforce zebra striping and 48px minimum row height on Ingredients and Packaging line-item tables
  │     ├── Enforce `font-mono` on all line costs, unit production costs, and recommended retail prices
  │     ├── Upgrade costing cards to 16px radius (`rounded-2xl`) and 24px padding (`p-6`)
  │     └── Update Commit Pricing and Add Ingredient CTAs to `#D97A34`
  │
  ├── Task 2.5: Modernize `Recipes.tsx` Master & Modals
  │     ├── Convert grid cards to 16px radius (`rounded-2xl`), 24px padding (`p-6`), and `#E5E3DF` borders
  │     ├── Implement zebra striping and 48px minimum row height in List View table
  │     ├── Scale H1 to 48px (`text-5xl font-bold`)
  │     └── Update `+ Create First Recipe` CTA to `#D97A34` with 8px radius
  │
  └── Task 2.6: Modernize `Settings.tsx`
        ├── Scale H1 to 48px and section headers to 32px
        ├── Update cards to 16px radius and `#E5E3DF` borders
        └── Update backup and save actions to `#D97A34`
                │
                ▼
[Wave 3: Test Validation & Verification] (Assigned to /bakeiq-fullstack-engineer & qa-automation-tester)
  ├── Task 3.1: Run unit test suites (`npm run test`) verifying component rendering and calculation stability
  ├── Task 3.2: Verify TypeScript compilation (`tsc --noEmit`) and production bundle (`npm run build`)
  └── Task 3.3: Run full Playwright E2E regression suite (recipes, inventory, markup simulation)
                │
                ▼
[Wave 4: Strict Quality Gatekeeper Review] (Assigned to code-reviewer)
  └── Task 4.1: Audit against `ScreenAuditChecklist.md`, verify 100% compliance score, update `.review_strikes.log`
```

---

## 4. Affected Files & Deliverables

| Wave | Component / Target File | Action | Specific Change |
|---|---|---|---|
| **1** | `pricing-calculator/src/index.css` | Edit | Inject `#0F0F0F`, `#F9F8F6`, `#D97A34`, `#4A7C59`, `#E5E3DF`, `#6B6B6B` tokens |
| **1** | `pricing-calculator/src/components/ui.tsx` | Edit | Standardize Card (16px), Button (8px, `#D97A34`), Input (8px, `#E5E3DF`), Badge (999px) |
| **1** | `pricing-calculator/src/components/Sidebar.tsx` | Edit | Change to `w-[240px]`, `#0F0F0F` dark background, `#D97A34` active state |
| **1** | `pricing-calculator/src/App.tsx` | Edit | Set app canvas wrapper to `bg-[#F9F8F6]` |
| **2** | `pricing-calculator/src/pages/Dashboard.tsx` | Edit | 48px H1, 16px radius Bento Box cards, `#D97A34` primary CTAs |
| **2** | `pricing-calculator/src/pages/Ingredients.tsx` | Edit | Zebra striping, 48px row height, `font-mono` costs, 16px radius modals |
| **2** | `pricing-calculator/src/pages/Inventory.tsx` | Edit | Zebra striping, 48px row height, `#D97A34` delivery CTAs, 24px card padding |
| **2** | `pricing-calculator/src/pages/RecipeBuilder.tsx` | Edit | Zebra striping on line items, `font-mono` financial numbers, `#D97A34` commit button |
| **2** | `pricing-calculator/src/pages/Recipes.tsx` | Edit | 16px card radius, zebra striping on list view, 48px row height, `#D97A34` create button |
| **2** | `pricing-calculator/src/pages/Settings.tsx` | Edit | 48px H1, 32px H2, 16px card radius, 8px inputs and buttons |
| **3** | `pricing-calculator/src/**/*.spec.ts` | Test | Execute Vitest unit tests & Playwright E2E suites |
| **4** | `.review_strikes.log` | Review | Record quality gate verification pass |

---

## 5. Verification Commands

1. **Type & Lint Check**: `npx tsc --noEmit`
2. **Unit Test Pass**: `npm run test`
3. **Production Build Pass**: `npm run build`
4. **E2E Playwright Suite**: `npx playwright test`

---

## 6. Risk Mitigations & Rollback Strategy

- **Visual Regression Defense**: All unit test assertions verifying recipe pricing math, markup percentages, and UOM yields must remain 100% untouched.
- **Rollback Protocol**: If any breaking change occurs or review fails 3 times:
  - Run `git restore .` to revert changes safely to the pre-sprint checkpoint.
