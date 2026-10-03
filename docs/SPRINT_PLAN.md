# Sprint Plan: Header Dark/Light Mode Icon Button Relocation

**Lead Architect**: `/solution-architect-business-planner`  
**Assigned UI/UX Specialist**: `/frontend-uiux-design-expert`  
**QA Specialist**: `qa-automation-tester`  
**Quality Gatekeeper**: `code-reviewer`  
**Sprint Status**: `[COMPLETED & APPROVED]` ✅  

---

## 1. Executive Summary & Design System Rationale

The user requested moving the light/dark mode button to the header's right side and transforming it into a clickable icon.

### Current As-Is State:
- The theme toggle is located at the bottom of `Sidebar.tsx` (lines 213–226).
- It is rendered as a wide card button with text: `"Kitchen Dark Mode"`, emoji indicators (`"☀️"` / `"🌙"`), and an `"ON"` / `"OFF"` mono badge.
- While functional, placing the theme switcher at the bottom of the sidebar creates ergonomic friction and unnecessary visual bulk in the primary navigation rail.
- `Header.tsx` currently houses breadcrumbs/modes on the left, and utility actions on the right: Command palette hint (`⌘K`), `Manage Ingredients` link, `+ New Recipe` button, `Bell` notification button, and the User & Branch profile pill (`GB`, `Glenz Bakeshop`).

### Desired To-Be State:
1. **Header Placement**: Move the theme toggle to the right-hand utility action cluster in `Header.tsx`, positioned harmoniously alongside the `Bell` notification button and the User Profile pill.
2. **Clickable Icon Ergonomics**:
   - Replace the wide card button and text with a compact, refined icon button matching the header's design system tokens (`p-2`, rounded border, subtle hover elevation, smooth color transitions).
   - Use clean, modern icons from `lucide-react`: `Sun` when in dark mode (indicating the action to switch to light mode), and `Moon` when in light mode (indicating the action to switch to dark mode).
   - Ensure clear visual affordance with amber accent coloring for the `Sun` icon in dark mode and slate/espresso tones for the `Moon` icon in light mode.
3. **Accessibility & Test Stability**:
   - Add descriptive `title` and `aria-label` attributes (`"Switch to Light Mode"` / `"Switch to Dark Mode"`).
   - Retain `id="theme-toggle-btn"` so existing automated test scripts and future E2E specs continue targeting the exact same DOM anchor.
4. **Sidebar Clean-Up**:
   - Remove the retired button from `Sidebar.tsx`.
   - Remove unused `setTheme` and `isDark` hooks from `Sidebar.tsx`.
   - Retain the clean system version & currency indicator (`v3.2.0 • Real-Time FIFO` and `PHP (₱)`) in the sidebar footer.

---

## 2. Work Breakdown Structure (DAG WBS)

```
[Phase 1: Architectural Blueprint & User Confirmation] ──────► [CURRENT]
                      │
                      ▼ (Upon User [YES])
[Phase 2: UI/UX Implementation] (Assigned to /frontend-uiux-design-expert)
  ├── Task 2.1: Header.tsx Modernization
  │     ├── Import `Sun` and `Moon` from `lucide-react`
  │     ├── Destructure `setTheme` and compute `isDark` from `useApp()`
  │     ├── Implement clickable icon button in right-hand action cluster
  │     ├── Apply design tokens matching adjacent `Bell` button
  │     ├── Add `title` and `aria-label` for accessibility
  │     └── Retain `id="theme-toggle-btn"` for test stability
  │
  └── Task 2.2: Sidebar.tsx Clean-Up
        ├── Remove the retired multi-line card button from the sidebar footer
        ├── Remove unused `setTheme` and `isDark` state declarations
        └── Verify sidebar footer layout spacing and alignment
                      │
                      ▼
[Phase 3: Verification & Regression Testing] (Assigned to qa-automation-tester)
  ├── Task 3.1: TypeScript compilation & Vite bundle build (`npm run build`)
  └── Task 3.2: Full Playwright E2E test suite execution to verify zero regressions
                      │
                      ▼
[Phase 4: Strict Quality Gatekeeper Review] (Assigned to code-reviewer)
  └── Task 4.1: Verify zero debug remnants, zero build warnings, clean visual layout, update `.review_strikes.log`
```

---

## 3. Detailed Itemized Deliverables

### Deliverable A: `pricing-calculator/src/components/Header.tsx`
| Line / Section | Element | Current Implementation | Action | Specification |
| :--- | :--- | :--- | :--- | :--- |
| **Imports (Line 5)** | Icon imports | `Search, Package, Plus, Bell` | **Add `Sun, Moon`** | `import { Search, Package, Plus, Bell, Sun, Moon } from "lucide-react";` |
| **Hook Usage (Line 13)** | `useApp` | `const { state } = useApp();` | **Destructure `setTheme`** | `const { state, setTheme } = useApp();` and `const isDark = state.settings.theme === "dark";` |
| **Right Action Cluster (Lines 80–93)** | Theme Toggle Button | Not present in Header | **Insert Icon Button** | Insert between `Bell` button and Profile divider:<br/>`<button onClick={() => setTheme(isDark ? "light" : "dark")} className="p-2 flex items-center justify-center text-espresso-600 dark:text-slate-300 hover:text-espresso-900 dark:hover:text-white bg-artisan-surface dark:bg-[#141b2c] hover:bg-artisan-subtle dark:hover:bg-slate-800 border border-artisan-border dark:border-slate-800 rounded-lg transition-colors cursor-pointer" title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"} aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"} type="button" id="theme-toggle-btn">{isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-espresso-600 dark:text-slate-300" />}</button>` |

### Deliverable B: `pricing-calculator/src/components/Sidebar.tsx`
| Line Range | Element | Current Implementation | Action | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Lines 8–9** | Hook State | `const { state, setTheme } = useApp();`<br/>`const isDark = state.settings.theme === "dark";` | **Remove `setTheme` and `isDark`** | Neither is used in `Sidebar.tsx` once the button is relocated to `Header.tsx`. Only keep what is needed or keep `useApp()` if needed. |
| **Lines 213–226** | Sidebar Footer Button | Bulky `<button id="theme-toggle-btn">...</button>` card | **Delete** | Relocated to Header as a streamlined clickable icon button. |
| **Lines 228–235** | Engine Status | `v3.2.0 • Real-Time FIFO` & `PHP (₱)` | **Retain & Preserve** | Clean operational status remains neatly padded in the footer. |

---

## 4. Verification & Testing Protocol

1. **Static Compilation & Type Safety**:
   - Run `npm run build` (`tsc && vite build`) to confirm zero TypeScript compilation errors and bundle emission.
2. **Interactive UI Verification**:
   - Verify clicking the theme icon switches the app between light (`Artisan Canvas`) and dark (`Nocturne Dark`) modes instantly.
   - Verify the icon switches dynamically (`Moon` in light mode, `Sun` in dark mode).
   - Verify tooltip displays correct text on hover.
3. **End-to-End Playwright Automated Testing**:
   - Execute the test suite via `npx playwright test` to ensure zero regressions across navigation, recipe builder, inventory, and costing modules.
4. **Visual & Responsive Ergonomics**:
   - Check header alignment at desktop and tablet viewports to ensure the right-hand action cluster wraps gracefully and does not collide with the profile pill.

---

## 5. Rollback & Anti-Failure Safety Measures

If an abort or rollback is triggered:
- The system will execute:
  ```bash
  git checkout -- pricing-calculator/src/components/Header.tsx \
                 pricing-calculator/src/components/Sidebar.tsx
  ```
- All changes are strictly UI/UX presentational adjustments and do not touch SQLite schemas, Rust IPC commands, or costing math.
