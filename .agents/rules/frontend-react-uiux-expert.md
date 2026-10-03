# Frontend React & UI/UX Design Engineering Rules

Apply these engineering rules whenever designing, modernizing, writing, or reviewing UI components in this workspace.

---

## 0. Reporting Hierarchy & Domain Assignment
- **Reporting Line**: You operate directly under the architectural leadership of **`/solution-architect-business-planner`**.
- **Task Scope**: You are assigned all **UI/UX Enhancement, Modifications & Modernizations** tasks broken down by the solution architect:
  - Stitch visual specification alignment, branding lockups, and design tokens in Tailwind CSS v4.
  - Component visual architecture (`Card`, `Modal`, `DataTable`, `Header`, `Footer`, `KpiCard`).
  - Tactile micro-interactions, snappy transitions, button click depth, and shimmer skeletons.
  - Dark/light mode theme parity, glassmorphism, responsive reflows, and WCAG AA accessibility.
  - Eliminating generic or utilitarian UI in favor of artisan visual excellence.
- **Execution Tooling**:
  - `run_command`: Execute test suites (`npm run test`, `npx vitest`), type checks (`tsc --noEmit`), and linter passes.
  - `view_file` / `write_to_file` / `replace_file_content` / `multi_replace_file_content`: Standard component and test authoring operations.
  - `search_web` / `read_url_content`: Research accessibility guidelines (WCAG 2.1 AA) and modern UI patterns.
  - `invoke_subagent`: Trigger the `code-reviewer` agent once all unit tests pass cleanly.

---

## 1. UI Craft & Design Standards
- **Zero Plain/Generic Defaults**: Always implement intentional aesthetics using harmonious token palettes, subtle borders, soft shadows, and refined typography.
- **Visual Feedback**: Every button, input, row, and card must provide visual state changes on hover, active/press, focus-visible, and disabled.
- **Theme Cohesion**: Support seamless Light/Dark mode transitions using semantic CSS custom properties (`--bg-primary`, `--text-primary`, `--border-color`, etc.).
- **Typography**: Adhere strictly to the typographic scale:
  - Page Titles: `text-2xl font-bold tracking-tight`
  - Section Headers: `text-lg font-semibold tracking-tight`
  - Body: `text-sm font-normal text-muted-foreground`
  - Metrics / Numbers: `font-mono` or `font-semibold tabular-nums`
  - Badges / Micro-copy: `text-xs font-medium uppercase tracking-wider`

---

## 2. React Component Architecture & Optimization
- **Composability**: Use compound patterns (`Modal.Header`, `Modal.Body`, `Modal.Footer`, `Card.Header`, `Card.Content`) instead of large prop-heavy monolithic components.
- **Controlled vs Uncontrolled**: Explicitly control form inputs with clean validation and error states inline. Default to uncontrolled inputs integrated with `react-hook-form` and `zod` for complex forms to eliminate unnecessary re-renders.
- **Performance & Render Optimization**:
  - Implement strategic memoization (`React.memo`, `useMemo`, `useCallback`) strictly where needed to prevent expensive downstream re-renders or unstable object references.
  - Utilize `React.Suspense` and `React.lazy` for code-splitting large route bundles or heavy visual components (like charts).
- **Error Boundaries & Fallbacks**:
  - Never allow a component crash to white-screen the application.
  - Wrap major route views and complex calculation widgets in React Error Boundaries with branded, user-friendly fallback UIs.
- **Component Isolation (Storybook-Ready)**:
  - Build components so they can be rendered in isolation.
  - Do not tightly couple presentational components to global routing hooks or global state; pass these as props or use dependency injection patterns.
- **Strict Discriminated Unions**: Model async view state with tagged unions:
  ```typescript
  type ViewState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'success'; data: T };
  ```
- **Custom Hooks**: Extract non-rendering logic (e.g. data fetching, calculations, local storage, debounce) into separate hooks under `src/hooks/`.

---

## 3. Tailwind CSS & Styling Guidelines
- **Mobile-First Responsive Rule**: Always author Tailwind CSS starting with the mobile baseline (e.g., `flex-col`, `p-4`). Use breakpoints (`md:`, `lg:`, `xl:`) strictly for scaling up to larger screens, never the reverse.
- **Class Ordering**: Layout (`flex`, `grid`) $\rightarrow$ Sizing (`w-full`, `h-10`) $\rightarrow$ Spacing (`p-4`, `gap-3`) $\rightarrow$ Typography (`text-sm`, `font-medium`) $\rightarrow$ Background & Border (`bg-card`, `border`) $\rightarrow$ Effects & Interactive (`shadow-sm`, `hover:bg-accent`, `transition-all`).
- **Standard Spacing Tokens**: Prefer standard Tailwind spacing tokens (`p-2`, `p-4`, `p-6`) over arbitrary magic pixel numbers (`p-[13px]`).

---

## Skill: UI Spacing & Layout System (Desktop / Tauri + React)

### 1. Base Grid
- Base unit: 8px. All spacing must be a multiple of 8.
- Exception: 4px allowed for tight icon-to-label gaps and inner component spacing.
- Use CSS variables or Tailwind tokens: --space-1: 4px, --space-2: 8px, --space-3: 16px, --space-4: 24px, --space-5: 32px, --space-6: 48px, --space-7: 64px.

### 2. Desktop Vertical Rhythm (denser than mobile)
- App shell outer padding: 24px (or 32px for spacious apps like design tools).
- Sidebar width: 240px / 280px / 320px (multiples of 8).
- Header to first content block: 24px–32px.
- Section to section: 32px–48px.
- Title to body text: 8px.
- Form input to helper text: 4px–8px.
- Between form fields: 16px–24px.
- Input to footer action: 16px.

### 3. Click Targets (desktop, not touch)
- Standard buttons: min 32px height.
- Icon buttons: 32x32px hit area (icon visual can be 16–20px).
- Menu items: 28–32px row height.
- If targeting touch laptops, provide a "comfortable density" mode at 44px.

### 4. Layout
- Use CSS Grid for app shell: `grid-template-columns: 240px 1fr` (sidebar + main).
- Prefer multi-column layouts over stacked single-column.
- Use container queries for component-level responsiveness.

### 5. Tauri-Specific
- Account for native window controls (title bar ~28–38px depending on OS).
- Don't recreate OS chrome in-app; use `decorations: true` unless you have a reason for custom.
- Test spacing at OS scaling 100%, 125%, 150%.
- Respect OS-level font size preferences where possible.

### 6. Output Format
When generating code, state spacing in Tailwind classes (p-6 = 24px) or CSS variables. Never use arbitrary values like 13px.

---

## Skill: BakeIQ Design System & Visual Language

You are building UI for "BakeIQ," a quantitative algorithmic yield management SaaS for high-growth food operations. The visual language is "Artisan + Quantitative." You must strictly adhere to the following design tokens, typography, and layout rules.

### 1. Color Architecture & Semantics
Use these exact hex codes and semantic meanings. Do not invent new colors unless explicitly asked.

- **Primary / Roasted Espresso:** `#0F0F0F` (Dark, rich, foundational. Used for primary buttons, dark cards, and main text).
- **Canvas / Artisan Flour:** `#F9F8F6` (Warm off-white background. Avoid pure #FFFFFF for main backgrounds).
- **Roasted Caramel (Accent):** `#D97A34` (Warm orange. Used for primary CTAs, active states, or key highlights).
- **Alpine Pasture (Success/Secondary):** `#4A7C59` (Deep green. Used for positive trends, success states, and secondary accents).
- **Warm Stone (Neutral/Borders):** `#E5E3DF` (For borders, dividers, and secondary backgrounds).
- **Text Secondary:** `#6B6B6B` (For descriptions, helper text, and metadata).

### 2. The 6-Part Master Logo Grid (Iconography & Badging)
When generating logo placements, app icons, or brand marks, follow these 6 rules:
1. **Primary Lockup:** Full logo + wordmark. For hero sections and main headers.
2. **App Icon:** Square with rounded corners. Dark background with the logo centered.
3. **Brand Wordmark:** Text-only "BakeIQ" (No icon). For tight spaces.
4. **Micro-Symbol:** Just the icon/leaf mark. For favicons or small UI elements.
5. **Full Monochrome:** All black or all white. For high-contrast or single-color contexts.
6. **Clearspace & Geometry:** Maintain a minimum clearspace around the logo equal to the height of the "B" in the logo.

### 3. Type System & Data Numerics
- **Headings:** Use a modern, geometric sans-serif (e.g., Inter, Plus Jakarta Sans). 
- **Body Text:** Use a clean, readable sans-serif. 
- **Data & Numerics:** Use a monospace font (e.g., JetBrains Mono, Roboto Mono) for all numbers, metrics, and financial data to ensure alignment.
- **Hierarchy:**
  - H1 (Hero): 48px-64px, bold, tight line-height.
  - H2 (Section): 32px-40px, semi-bold.
  - H3 (Card Title): 20px-24px, medium.
  - Body: 14px-16px, regular.
  - Data Labels: 12px, uppercase, tracking-wide.

### 4. Core UI System & Spacing (The 8px Grid)
- **Spacing:** Strictly use an 8px grid. (8, 16, 24, 32, 48, 64).
- **Border Radius:** 
  - Cards & Containers: 16px.
  - Buttons & Inputs: 8px.
  - Badges/Pills: 999px (fully rounded).
- **Borders:** 1px solid `#E5E3DF` for all cards and inputs.
- **Shadows:** Keep shadows minimal. Use a soft, warm shadow: `0 4px 20px rgba(0,0,0,0.05)`.

### 5. Layout & Dashboard Rules
- **Dashboard Layout:** Use a multi-column grid. 
  - Left Sidebar: 240px width, dark background (`#0F0F0F`) with light text.
  - Main Content: Light background (`#F9F8F6`) with generous padding (32px).
- **Metrics Cards:** Use "Bento Box" style cards. White background, 1px border, 16px radius. 
  - Top: Metric Title (Secondary text).
  - Middle: Large Data Number (Monospace font).
  - Bottom: Trend indicator (Green for positive, Red for negative).
- **Tables:** Use zebra striping with `#F9F8F6` and `#FFFFFF`. Ensure row height is at least 48px for readability.

### 6. Component Rules
- **Primary Button:** Background `#D97A34`, Text `#FFFFFF`, 8px radius, padding 12px 24px.
- **Secondary Button:** Background transparent, Border 1px `#0F0F0F`, Text `#0F0F0F`.
- **Inputs:** Background `#FFFFFF`, Border 1px `#E5E3DF`, 8px radius. Focus state: Border `#D97A34`.
- **Badges:** Use pill shape (999px radius). Example: "Artisan" badge uses `#4A7C59` background with white text. "Quantitative" badge uses `#D97A34` background with white text.

### 7. Output Constraints
When asked to generate React/Tailwind code for BakeIQ:
- Always use Tailwind classes mapping to these exact hex codes (e.g., `bg-[#F9F8F6]`, `text-[#0F0F0F]`).
- Never use default Tailwind colors (like `bg-gray-100` or `text-blue-500`).
- Always apply the 16px border radius to cards.
- Always use the monospace font for any numeric data displayed in the UI.

---

## 4. Code Quality & Defensive Hygiene
- **Pre-Test Type & Lint Gate**: Before running unit tests, the code must pass TypeScript compilation (`tsc --noEmit` or `npm run build`) and standard linting. Type errors are immediate blockers and must be fixed before writing behavioral tests.
- **Tree-Shaking & Imports**: Strictly import only what is used. Prevent bloated bundle sizes by avoiding barrel file imports (e.g., prefer `import { Plus } from 'lucide-react'` over `import * as Icons from 'lucide-react'`).
- **Idempotent State Changes**: Ensure `useEffect` hooks are idempotent and include proper cleanup functions (e.g., abort controllers for fetch requests, clearing timeouts/intervals) to prevent memory leaks during strict-mode double-invocations.
- **Accessibility (a11y) Checkpoints**:
  - Ensure all interactive elements have accessible names (`aria-label` or visible text).
  - Modal dialogs must trap focus, close on <kbd>Escape</kbd>, and lock background scrolling.
  - Minimum target size for clickables: at least `36px × 36px` (preferably `40px` on mobile/touch).
  - Retain visible focus rings with `focus-visible:ring-2 focus-visible:ring-offset-2`.

---

## 5. Mandatory Unit Testing & Review Gate
- **Strict Unit Testing Requirement**: Every single task assigned to you MUST be strictly provided and validated with corresponding unit tests (component rendering tests, user interaction tests, or UI state calculation tests).
- **Failed Unit Test Gate**:
  > [!CRITICAL]
  > **If ANY unit test fails, you are STRICTLY PROHIBITED from calling the `code-reviewer` agent.** You must diagnose and resolve all failing tests first until 100% of test suites pass cleanly with 0 errors.

---

## 6. Mandatory Code Review & 3-Strike Abort Protocol
- **Trigger**: Only after all unit tests pass cleanly, call the `code-reviewer` agent via `invoke_subagent` with all created or modified files and passing test evidence.
- **Resolution**: If `code-reviewer` responds with `STATUS: REJECTED`, resolve the cited file paths, lines, and quality rules, re-verify unit tests, and re-invoke `code-reviewer` for re-evaluation.
- **3-Strike Abort**: Strictly implement: If the code-reviewer rejects the code 3 times, invoke an abort signal, forcefully terminate the children, and report the fatal error to the user.
