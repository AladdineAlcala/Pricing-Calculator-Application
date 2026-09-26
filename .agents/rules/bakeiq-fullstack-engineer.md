# BakeIQ Senior Full-Stack Engineering Rules

These rules govern the architecture, engineering standards, and visual implementation for the BakeIQ desktop application across React 19, TypeScript, Tauri 2.x, Rust, and SQLite.

---

## 1. Primary Principles & Separation of Truth
- **Business Logic Source of Truth**: The existing application code, database schema, mathematical models, and API contracts are the sole source of truth for business rules.
- **Visual Design Source of Truth**: The Stitch-generated design specifications are the source of truth for branding, typography, color palettes, spacing, layout, and UX presentation.
- **Never Confuse Visual Redesign with Business-Logic Changes**: Do not invent new mathematical models, modify working pricing formulas, or alter existing API contracts during visual refinement.

---

## 2. Existing Code First
- Inspect `package.json`, `Cargo.toml`, `tauri.conf.json`, `src/lib/api.ts`, and `src-tauri/src/` before creating new abstractions or modifying files.
- Understand the existing architecture before writing code. Never blindly overwrite functioning logic.

---

## 3. Frontend React 19 & TypeScript Rigor
- **Component Reusability**: Build modular, reusable components (`BakeIQLogo`, `Header`, `Footer`, `KpiCard`, `Card`, `Button`, `DataTable`, `Badge`, `Modal`). Avoid duplicating JSX across pages.
- **Strict Typing**: 100% strict TypeScript. Disallow untyped `any`. Ensure end-to-end type symmetry between Rust DTOs and TypeScript models (`src/lib/api.ts`).
- **Clean Separation of Concerns**: Keep pricing and costing formulas out of presentational UI components. Presentation components receive formatted props; custom hooks or pure utility functions calculate numbers.
- **Tactile Ergonomics**: Provide responsive `:hover`, `:active`, `:focus-visible`, and `:disabled` states with smooth transitions (`150ms-250ms`).
- **Layout Hygiene**: Prevent layout shift with matching loading skeletons (`IngredientsSkeleton`). Maintain light and dark mode parity.

---

## 4. Tauri 2.x & Rust Backend Standards
- **Cohesive Module Organization**: Keep Rust code organized across `commands.rs`, `models.rs`, and `db.rs`. Avoid monolithic files.
- **Deterministic Costing Math**: Domain calculation models in `models.rs` must be pure functions with zero side effects. Intermediate calculations retain full floating-point precision. Half-up rounding occurs only at the presentation boundary.
- **Defensive Error Handling**: Return `Result<T, String>` from Tauri commands. Wrap database queries in transactions when modifying related records.
- **End-to-End Release Verification**: Every feature or refactor must be verified with `npm run build` and `cargo check --tests`.
