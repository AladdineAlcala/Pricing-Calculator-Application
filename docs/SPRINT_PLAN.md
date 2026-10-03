# Sprint Plan: Extended Quick Markup Simulation Presets (20%, 30%, 40%, 50%, 60%, 75%, 100%)

**Lead Architect & Orchestrator**: `/solution-architect-business-planner`  
**Assigned UI/UX Specialist**: `/frontend-uiux-design-expert` (Component Ergonomics, Grid Layout, Active State Design Tokens)  
**Assigned Full-Stack Specialist**: `/bakeiq-fullstack-engineer` (Costing Engine Synchronization & Verification)  
**Assigned QA Specialist**: `qa-automation-tester` (Adversarial E2E Playwright Suite, Simulation Verification)  
**Strict Quality Gatekeeper**: `code-reviewer`  
**Sprint Status**: `[COMPLETED & APPROVED] ✅`  

---

## 1. Executive Summary & Business Requirements

The user requested expanding the **Quick Markup Simulation** feature in `RecipeBuilder.tsx` to include the following discrete markup percentages:
- **`20%`** (Commercial / High-Volume Wholesale Tier)
- **`30%`** (Contract Bakery & Partner Wholesale Tier)
- **`40%`** (Standard Retail Baseline)
- **`50%`** (Traditional Bakery Retail Tier)
- **`60%`** (Artisan & Café Retail Tier)
- **`75%`** (Specialty & High-Margin Delicacy Tier)
- **`100%`** (Premium / Custom Order / Double Cost Tier)

### Current State vs. Target State
- **As-Is**: Currently, the simulation section renders only 3 buttons in a single row (`Current`, `Optimal`, and `Premium = Current + 25%`).
- **To-Be**:
  1. A dedicated **Standard Industry Presets Grid** containing all 7 requested percentages (`+20%`, `+30%`, `+40%`, `+50%`, `+60%`, `+75%`, `+100%`).
  2. Preserves the dynamic **Objective Simulation Tiers**:
     - **`Current`** (`+{r.target_markup_pct.toFixed(0)}% (Current)`)
     - **`Optimal`** (`+{optimalMarkupPct}% (Optimal)` needed to reach the benchmark objective)
  3. **Visual Active State Ergonomics**: The preset matching the recipe's active `target_markup_pct` will be visually highlighted with an emerald badge/ring, indicating that this markup is currently applied to the live recipe calculations.

---

## 2. Technical Contracts & Implementation Specifications

### Target File: `pricing-calculator/src/pages/RecipeBuilder.tsx`
- **Markup Preset Array**:
  ```typescript
  const QUICK_MARKUP_PRESETS = [20, 30, 40, 50, 60, 75, 100] as const;
  ```
- **Action Handler**:
  - `handleQuickMarkup(markupPct: number)` continues to persist the chosen markup via `updateRecipe` and trigger `load()` to recompute live RRP, Wholesale Price, Gross Profit, and Gross Margin.
- **Component Layout (Tailwind & Visual Hierarchy)**:
  ```tsx
  {/* Dynamic Objective Tiers */}
  <div className="grid grid-cols-2 gap-2">
    <button onClick={() => handleQuickMarkup(r.target_markup_pct)}>
      +{r.target_markup_pct.toFixed(0)}% (Current)
    </button>
    <button onClick={() => handleQuickMarkup(optimalMarkupPct)} disabled={optimalMarkupPct === 0}>
      +{optimalMarkupPct}% (Optimal)
    </button>
  </div>

  {/* Standard Industry Presets Grid */}
  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
    {QUICK_MARKUP_PRESETS.map((pct) => {
      const isActive = Math.round(r.target_markup_pct) === pct;
      return (
        <button
          key={pct}
          type="button"
          onClick={() => handleQuickMarkup(pct)}
          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
            isActive
              ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
              : "bg-white dark:bg-[#121826] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
          }`}
        >
          +{pct}%
        </button>
      );
    })}
  </div>
  ```

---

## 3. Work Breakdown Structure (DAG WBS)

```
[Phase 1: Component Layout & Preset Integration] (Assigned to /frontend-uiux-design-expert)
  ├── Task 1.1: Define `QUICK_MARKUP_PRESETS = [20, 30, 40, 50, 60, 75, 100]` in `RecipeBuilder.tsx`
  ├── Task 1.2: Restructure the Quick Markup Simulation container in Card 3
  ├── Task 1.3: Author active state highlights for matching preset percentages
  └── Task 1.4: Author tooltip/title attributes for bakery commercial tiers
                │
                ▼
[Phase 2: Adversarial E2E Verification] (Assigned to qa-automation-tester)
  ├── Task 2.1: Author Playwright test suite `e2e/quick_markup_simulation.spec.ts`
  │     ├── Vector 01: Verify all 7 preset buttons (20%, 30%, 40%, 50%, 60%, 75%, 100%) render correctly
  │     ├── Vector 02: Clicking +50% updates live RRP, wholesale price, and gross margin
  │     ├── Vector 03: Active button receives highlighted visual state
  │     └── Vector 04: "SAVE FORMULA & COMMIT PRICING" persists simulated markup into SQLite
  └── Task 2.2: Execute project-wide Playwright regression suite (all 31+ tests passing)
                │
                ▼
[Phase 3: Strict Quality Gatekeeper Review] (Assigned to code-reviewer)
  └── Task 3.1: Zero debug remnants, zero TypeScript/build errors, update `.review_strikes.log`
```

---

## 4. Verification & Acceptance Criteria

1. **Preset Coverage**: All requested figures (`20%`, `30%`, `40%`, `50%`, `60%`, `75%`, `100%`) are rendered as interactive buttons.
2. **Instant Recalculation**: Clicking any percentage updates the recipe's `target_markup_pct`, recalculating:
   - $\text{RRP} = \text{Unit Cost} \times (1 + \frac{\text{Markup}}{100})$
   - $\text{Gross Margin} = \frac{\text{RRP} - \text{Unit Cost}}{\text{RRP}} \times 100$
3. **Build Gate**: `npm run build` compiles with 0 errors.
4. **Automated E2E Gate**: Playwright test suite passes with 0 regressions.

---

## 5. Rollback Safety Plan

If rollback is needed:
```powershell
git checkout -- pricing-calculator/src/pages/RecipeBuilder.tsx
rm -f pricing-calculator/e2e/quick_markup_simulation.spec.ts
```

---

## 6. Delivery & Verification Sign-Off

- [x] **Phase 1: Component Layout & Preset Integration (`RecipeBuilder.tsx`)**:
  - Implemented 7 standard industry markup presets (`20%`, `30%`, `40%`, `50%`, `60%`, `75%`, `100%`) in a responsive grid.
  - Active markup matching the recipe's `target_markup_pct` is highlighted with emerald active styling and ring indicator.
  - Dynamic `(Current)` and benchmark `(Optimal)` buttons preserved with polished styling and disabled states.
- [x] **Phase 2: Adversarial E2E Verification (`qa-automation-tester`)**:
  - Authored `e2e/quick_markup_simulation.spec.ts` with 4 dedicated test vectors.
  - 4/4 quick markup simulation tests passed.
  - 35/35 project-wide regression tests passed cleanly.
- [x] **Phase 3: Strict Quality Gatekeeper Review (`code-reviewer`)**:
  - `npm run build` compiled with 0 errors.
  - Zero debug remnants (`console.log`, `debugger`, `dbg!`).
  - `.review_strikes.log` approved with 0 strikes.

