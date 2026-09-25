# Frontend React & UI/UX Design Engineering Rules

Apply these engineering rules whenever writing, refactoring, or reviewing React, TypeScript, CSS, and UI components in this workspace.

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

## 2. React Component Architecture
- **Composability**: Use compound patterns (`Modal.Header`, `Modal.Body`, `Modal.Footer`, `Card.Header`, `Card.Content`) instead of large prop-heavy monolithic components.
- **Controlled vs Uncontrolled**: Explicitly control form inputs with clean validation and error states inline.
- **Strict Discriminated Unions**: Model async view state with tagged unions:
  ```typescript
  type ViewState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'success'; data: T };
  ```
- **Custom Hooks**: Extract non-rendering logic (e.g. data fetching, calculations, local storage, debounce) into separate hooks under `src/hooks/`.

## 3. Tailwind CSS & Styling Guidelines
- Follow class ordering: Layout (`flex`, `grid`) $\rightarrow$ Sizing (`w-full`, `h-10`) $\rightarrow$ Spacing (`p-4`, `gap-3`) $\rightarrow$ Typography (`text-sm`, `font-medium`) $\rightarrow$ Background & Border (`bg-card`, `border`) $\rightarrow$ Effects & Interactive (`shadow-sm`, `hover:bg-accent`, `transition-all`).
- Prefer standard Tailwind spacing tokens (`p-2`, `p-4`, `p-6`) over arbitrary magic pixel numbers (`p-[13px]`).

## 4. Accessibility (a11y) Checkpoints
- Ensure all interactive elements have accessible names (`aria-label` or visible text).
- Modal dialogs must trap focus, close on <kbd>Escape</kbd>, and lock background scrolling.
- Minimum target size for clickables: at least `36px × 36px` (preferably `40px` on mobile/touch).
- Retain visible focus rings with `focus-visible:ring-2 focus-visible:ring-offset-2`.
