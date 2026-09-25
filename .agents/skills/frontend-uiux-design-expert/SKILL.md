---
name: frontend-uiux-design-expert
description: >-
  Expert guidance for senior Frontend React engineering, UI/UX product design, component architecture, design system tokenization, micro-interactions, responsive ergonomics, and accessibility (WCAG). Use when designing, building, auditing, or refactoring React interfaces, Tailwind styles, user experiences, or frontend state management.
---

# Senior Frontend React & UI/UX Design Expert Skill

This skill guides the design, implementation, and refinement of modern, high-craft web and desktop frontend applications using React, TypeScript, and modern CSS/Tailwind.

---

## 🎯 When to Use This Skill
- Designing new screens, dashboards, modals, or user workflows.
- Refactoring complex or messy React components into clean, composable compound architectures.
- Upgrading visual aesthetics (dark/light themes, elevation, typography, color harmony, micro-animations).
- Implementing robust state management, custom hooks, and optimistic UI patterns.
- Auditing UI for accessibility (a11y), responsive ergonomics, and interaction feedback.

---

## 📐 Core Workflows

### 1. The 5-Pillar UI/UX Design Pass
Before and during component generation, run through the 5-pillar checklist:
1. **Hierarchy & Scannability**: Can a user understand the primary call to action in under 3 seconds? Are secondary actions visually demoted?
2. **Typography & Rhythm**: Is font size, weight, and letter-spacing proportional? Are numbers displayed with `tabular-nums`?
3. **Contrast & Color Semantics**: Do semantic colors match user intuition (Red = destructive/alert, Emerald/Green = success, Amber = warning, Indigo/Blue = primary brand)? Are contrast ratios compliant with WCAG AA?
4. **Interactive Tactility**: Does every interactive element respond instantly to hover, focus, and click?
5. **Edge State Grace**: How does the UI behave with 0 items (empty state), 1,000 items (scroll/pagination), extremely long text (truncation with tooltip), or network failure?

### 2. React Component Architecture Patterns
When architecting components, follow these best practices:
- **Slot / Compound Pattern**:
  ```tsx
  // Good: Composable compound pattern
  <Card>
    <Card.Header>
      <Card.Title>Total Recipe Cost</Card.Title>
      <Card.Action><Button variant="ghost" size="sm">Edit</Button></Card.Action>
    </Card.Header>
    <Card.Content>...</Card.Content>
  </Card>
  ```
- **Custom Hook Separation**:
  Separate business logic and side effects from presentation:
  - `useRecipeCosting(recipeId)` $\rightarrow$ handles data fetching, calculation triggers, loading state.
  - Presentational Component $\rightarrow$ receives clean props and renders UI.

### 3. Micro-Interaction & Animation Recipes
- **Snappy Transitions**: `transition-all duration-200 ease-out`
- **Subtle Hover Elevation**: `hover:-translate-y-0.5 hover:shadow-md transition-transform`
- **Active Click Depth**: `active:scale-[0.98]`
- **Smooth Theme Transition**: Ensure `transition-colors duration-200` is applied on background and border tokens.

---

## 📋 Quality Audit Checklist
- [ ] No layout shift during data loading (use skeletons matching content height).
- [ ] Form inputs have clear labels, placeholder text, and explicit error messages.
- [ ] Keyboard navigation: <kbd>Tab</kbd> order is logical; modals close on <kbd>Escape</kbd>.
- [ ] High-density data tables have sticky headers and horizontal scroll indicators when needed.
- [ ] Numeric outputs formatted with proper locale and precision at the presentation boundary.
