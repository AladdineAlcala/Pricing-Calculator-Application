# Sprint Plan: Global Header & Sidebar BakeIQLogo Bottom Border Alignment

**Lead Architect**: `/solution-architect-business-planner`  
**Assigned UI/UX Specialist**: `/frontend-uiux-design-expert`  
**QA Specialist**: `qa-automation-tester`  
**Quality Gatekeeper**: `code-reviewer`  
**Sprint Status**: `[COMPLETED & APPROVED]` ✅  

---

## 1. Executive Summary & Root Cause Analysis

Following the successful alignment of the application footers, the user requested the exact same alignment for the top horizontal borders: aligning the bottom border of the top navigation header (`Header.tsx`) with the bottom border of the BakeIQLogo header container (`Sidebar.tsx`).

### Geometric Root Cause:
1. **Asymmetric Rendered Heights**:
   - In `Sidebar.tsx`, the brand lockup header container has an explicit height of `h-20` (**`80px`** / `5rem`).
   - In `Header.tsx`, the top navigation bar lacked a fixed height, relying on `py-3.5` with internal buttons (~34px). At standard 1280px desktop resolution, internal `flex-wrap` caused the mode indicators to wrap, expanding the computed header height to **`93px`** (or `~64px` un-wrapped).
2. **Horizontal Border Seam Discontinuity**:
   - Both `Sidebar` and `Header` originate at `y = 0` (top of the viewport).
   - In `Sidebar.tsx`, the bottom border of the logo container is situated at `y = 80px`.
   - In `Header.tsx`, the bottom border sat at `y = 93px` (or `y = 64px`).
   - This produced a visible **13px to 16px vertical step discontinuity** at the junction where the sidebar's right border intersects the top navigation header.

### Target Architectural Blueprint:
- Standardize both top containers to an explicit design token height of **`h-20`** (**`80px`** / `5rem`) with `flex items-center` and `shrink-0`.
- Standardize layout geometry:
  - In `Sidebar.tsx`: Ensure the logo container has `h-20 px-5 flex items-center border-b border-artisan-border dark:border-slate-800 shrink-0`.
  - In `Header.tsx`: Set the header element to `h-20 px-6 flex items-center justify-between border-b border-artisan-border dark:border-slate-800 shrink-0`.
  - In `Header.tsx`: Clean up responsive wrapping by setting the left breadcrumb cluster to `shrink-0 flex items-center gap-3` and adjusting the command palette hint to `hidden 2xl:flex` to prevent wrapping at 1280px.
- **Outcome**: Both top containers start at `y = 0` and have an exact `80px` height with `border-b`, positioning their bottom borders at the exact same vertical coordinate (**`y = 80px`**) with **0.00px variance**, creating an uninterrupted, continuous horizontal line across the top of the desktop application.

---

## 2. Work Breakdown Structure (DAG WBS)

```
[Phase 1: Architectural Blueprint & User Confirmation] ──────► [CURRENT]
                      │
                      ▼ (Upon User [YES])
[Phase 2: UI/UX Implementation] (Assigned to /frontend-uiux-design-expert)
  ├── Task 2.1: Header.tsx Height & Alignment Standardization
  │     ├── Set header container className to `h-20 px-6 flex items-center justify-between border-b border-artisan-border dark:border-slate-800 shrink-0`
  │     ├── Prevent wrapping on left breadcrumbs with `shrink-0 flex items-center gap-3 text-xs`
  │     └── Adjust command palette hint breakpoint to `hidden 2xl:flex` for responsive balance
  │
  └── Task 2.2: Sidebar.tsx Logo Header Constraint
        └── Ensure logo header has `h-20 px-5 flex items-center border-b border-artisan-border dark:border-slate-800 shrink-0`
                      │
                      ▼
[Phase 3: Verification & Regression Testing] (Assigned to qa-automation-tester)
  ├── Task 3.1: Static type check and production bundling (`npm run build`)
  └── Task 3.2: Automated Playwright E2E assertion verifying exact pixel bounding box alignment:
                `headerBox.y === logoBox.y === 0` and `headerBox.height === logoBox.height === 80`
                      │
                      ▼
[Phase 4: Strict Quality Gatekeeper Review] (Assigned to code-reviewer)
  └── Task 4.1: Verify zero debug remnants, zero build warnings, clean visual layout, update `.review_strikes.log`
```

---

## 3. Detailed Itemized Deliverables

### Deliverable A: `pricing-calculator/src/components/Header.tsx`
| Line Range | Current Implementation | Target Specification | Rationale |
| :--- | :--- | :--- | :--- |
| **Lines 18–21** | `<header className="sticky top-0 z-20 print:hidden bg-artisan-surface/95 dark:bg-[#0c101a]/95 backdrop-blur border-b border-artisan-border dark:border-slate-800 px-6 py-3.5 flex items-center justify-between gap-4" data-purpose="top-navigation">` | `<header className="sticky top-0 z-20 print:hidden bg-artisan-surface/95 dark:bg-[#0c101a]/95 backdrop-blur border-b border-artisan-border dark:border-slate-800 px-6 h-20 flex items-center justify-between gap-4 shrink-0" data-purpose="top-navigation">` | Fixes height to standard `80px` (`h-20`) to match `Sidebar.tsx` logo header. |
| **Line 23** | `<div className="flex items-center gap-3 text-xs flex-wrap">` | `<div className="flex items-center gap-3 text-xs shrink-0">` | Prevents multi-line wrapping inside the fixed `h-20` header. |
| **Line 40** | `<button ... className="hidden xl:flex items-center gap-2 ...">` | `<button ... className="hidden 2xl:flex items-center gap-2 ...">` | Prevents horizontal crowding on standard 1280px laptop screens. |

### Deliverable B: `pricing-calculator/src/components/Sidebar.tsx`
| Line Range | Current Implementation | Target Specification | Rationale |
| :--- | :--- | :--- | :--- |
| **Line 19** | `<div className="h-20 px-5 flex items-center border-b border-artisan-border dark:border-slate-800">` | `<div className="h-20 px-5 flex items-center border-b border-artisan-border dark:border-slate-800 shrink-0">` | Retains standard `80px` (`h-20`) and guarantees zero vertical shrink. |

---

## 4. Verification & Testing Protocol

1. **Static Compilation**:
   - `npm run build` must compile with 0 errors and zero warnings.
2. **Automated Mathematical Bounding Box Assertion**:
   - In Playwright, verify:
     ```ts
     const headerBox = await header.boundingBox();
     const logoBox = await logoHeader.boundingBox();
     expect(headerBox.height).toBe(80);
     expect(logoBox.height).toBe(80);
     expect(Math.abs((headerBox.y + headerBox.height) - (logoBox.y + logoBox.height))).toBeLessThanOrEqual(0.5);
     ```
3. **Full Regression Gate**:
   - All 24 Playwright tests must pass with 0 regressions.

---

## 5. Rollback & Anti-Failure Safety Measures

If an abort or rollback is triggered:
- The system will execute:
  ```bash
  git checkout -- pricing-calculator/src/components/Header.tsx \
                 pricing-calculator/src/components/Sidebar.tsx
  ```
- Changes are strictly layout styling classes on two navigation header components with zero impact on database schemas or costing formulas.
