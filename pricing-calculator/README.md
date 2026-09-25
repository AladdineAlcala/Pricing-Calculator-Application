# 🍰 Philippine Food Costing & Pricing Engine

A high-performance, precision-grade desktop application for commercial bakeries, culinary kitchens, and food manufacturing enterprises. Built with **Tauri v2**, **Rust**, **React 19**, **TypeScript**, and **Tailwind CSS v4**, this application eliminates margin leakage, automates multi-tier commercial pricing, and provides deterministic cost analytics.

---

## 📑 Table of Contents
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Commercial Pricing Mathematics](#-commercial-pricing-mathematics)
- [Key Features & Screen Workflows](#-key-features--screen-workflows)
  - [Recipe Builder Studio](#1-recipe-builder-studio-recipebuildertsx)
  - [Recipe Master & Catalog](#2-recipe-master--catalog-recipestsx)
  - [Raw Material Pantry](#3-raw-material-pantry-ingredientstsx)
  - [Executive Dashboard](#4-executive-dashboard-dashboardtsx)
- [Project Structure](#-project-structure)
- [Getting Started & Development](#-getting-started--development)
- [Verification & Quality Assurance](#-verification--quality-assurance)
- [Recent Implementation Changelog](#-recent-implementation-changelog)

---

## 🏛️ Architecture & Tech Stack

The application employs a strict layered architecture ensuring complete separation of concerns, high-precision intermediate calculations, and end-to-end type safety:

```
┌────────────────────────────────────────────────────────┐
│  Presentation Layer: React 19 + TypeScript + Tailwind v4 │
│  (Glassmorphism, Micro-Interactions, WCAG 2.1 AA)      │
└───────────────────────────┬────────────────────────────┘
                            │ Tauri IPC (Strongly Typed Invokes)
┌───────────────────────────▼────────────────────────────┐
│  Client API Layer: src/lib/api.ts                      │
└───────────────────────────┬────────────────────────────┘
                            │ Serde JSON Deserialization
┌───────────────────────────▼────────────────────────────┐
│  Rust Backend IPC Layer: src-tauri/src/commands.rs      │
└───────────────────────────┬────────────────────────────┘
                            │ Pure Domain Calculation
┌───────────────────────────▼────────────────────────────┐
│  Costing Engine: src-tauri/src/models.rs               │
│  (Deterministic Float Math, Zero Side Effects)         │
└───────────────────────────┬────────────────────────────┘
                            │ Transactional SQL Queries
┌───────────────────────────▼────────────────────────────┐
│  Data Persistence Layer: SQLite (rusqlite)             │
│  (Relational schema, foreign keys, cascade deletes)    │
└────────────────────────────────────────────────────────┘
```

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, React Router v6.
- **Backend / Desktop**: Tauri v2, Rust 2021 Edition, `rusqlite` (bundled SQLite 3), `serde` / `serde_json`.
- **Packaging**: Windows MSI/EXE installer and cross-platform desktop binary.

---

## 📐 Commercial Pricing Mathematics

All financial calculations follow rigorous cost accounting standards with zero unvalidated intermediary rounding. Half-up rounding is applied exclusively at presentation boundaries:

### 1. Direct Material & Unit Costing
$$\text{Normalized Unit Cost} = \frac{\text{Purchase Price}}{\text{Yield Factor}}$$
$$\text{Line Item Cost} = \text{Batch Quantity} \times \text{Normalized Unit Cost}$$
$$\text{Total Variable Cost} = \sum \text{Line Item Costs}$$

### 2. Production Overhead Allocation
$$\text{Total Overhead} = \text{Direct Labor} + \text{Electricity \& Gas} + \text{Other Consumables}$$
$$\text{Total Batch Cost} = \text{Total Variable Cost} + \text{Total Overhead}$$
$$\text{Base Cost Per Item} = \frac{\text{Total Batch Cost}}{\text{Batch Yield Units}}$$

### 3. Channel Pricing Tiers
- **Recommended Retail Price (RRP / B2C)**:
  $$\text{RRP} = \text{Base Cost Per Item} \times \left(1 + \frac{\text{Retail Markup \%}}{100}\right)$$
  $$\text{Gross Profit Per Item} = \text{RRP} - \text{Base Cost Per Item}$$
  $$\text{Gross Margin \%} = \frac{\text{Gross Profit Per Item}}{\text{RRP}} \times 100$$
  $$\text{Retail Revenue Per Batch} = \text{RRP} \times \text{Batch Yield Units}$$
  $$\text{Gross Profit Per Batch} = \text{Retail Revenue Per Batch} - \text{Total Batch Cost}$$

- **Reseller / Wholesale Pricing (B2B)**:
  $$\text{Reseller Price Per Item} = \text{Base Cost Per Item} \times \left(1 + \frac{\text{Reseller Markup \%}}{100}\right)$$
  $$\text{Reseller Profit Per Item} = \text{Reseller Price Per Item} - \text{Base Cost Per Item}$$
  $$\text{Channel Margin \%} = \frac{\text{Reseller Profit Per Item}}{\text{Reseller Price Per Item}} \times 100$$

### 4. Benchmark Profit Alert & Markup Simulation
- **Target Gap Alert**: Triggered whenever $\text{Gross Profit Per Batch} < \text{Desired Profit Benchmark}$.
- **Optimal Markup Simulation**:
  $$\text{Markup}_{\text{Optimal}} = \frac{\text{Total Overhead} + \text{Desired Profit Benchmark} - \text{Total Variable Cost}}{\text{Total Batch Cost}} \times 100$$

---

## 💻 Key Features & Screen Workflows

### 1. Recipe Builder Studio (`RecipeBuilder.tsx`)
- **Executive Glassmorphism & Header Hierarchy**: Breadcrumbs, recipe SKU, production status badge (`● Production Active`), and meta chips for Yield, Allocated Labor, Utilities, and Prep Time.
- **Dynamic Benchmark Gap Alert**: High-visibility amber banner highlighting margin deficits with direct "Adjust Target" modal trigger.
- **Interactive Ingredients Grid**:
  - Full financial breakdown: Purchase Price, Yield Factor, Normalized Unit Cost, Recipe Qty, and Line Cost.
  - Inline batch quantity modification with auto-recalculation on blur or Enter.
  - Sorting by Cost or Name; pantry row insertion modal with live search.
- **Production Overheads Breakdown**:
  - Itemized display for Labor, Electricity/Gas, and Consumables.
  - Multi-segment proportional visual distribution bar (`Labor %` vs `Utilities %`).
- **Batch Cost Breakdown & Base Unit Card**:
  - Real-time `LIVE CALC` status badge.
  - Prominent high-contrast **Base Cost Per Item** metric card.
- **Channel Pricing & Margin Studio**:
  - **Recommended Retail (RRP)** card with interactive markup tooltip explaining unit pricing logic.
  - **Reseller / Wholesale** card with channel margin analytics.
  - **Quick Markup Simulation Chips**: 1-click pricing tests for `Current`, `Optimal` (calculated target benchmark), and `Premium` (+25%) tiers.
  - `SAVE FORMULA & COMMIT PRICING` button with tactile feedback.
- **Utility Actions**: One-click CSV Export and Print-Ready Culinary Spec Sheet.

### 2. Recipe Master & Catalog (`Recipes.tsx`)
- **Dual Display Modes**: Seamless toggling between Grid Card View and Tabular Data Grid.
- **Advanced Filtering**: Live search by recipe name or SKU, category selection (Bakery, Pastries, Desserts, Savory), and margin status filtering.
- **Modern New Recipe Modal**: Structured 4-phase onboarding (General Information, Batch & Yield Configuration, Fixed Overhead Allocation, and Target Pricing Margins) with live pricing previews.

### 3. Raw Material Pantry (`Ingredients.tsx`)
- Comprehensive raw ingredient management: purchase units (kg, liter, pack, tray), yield factors, and purchase prices.
- Live cost-per-recipe-unit normalization.

### 4. Executive Dashboard (`Dashboard.tsx`)
- High-level portfolio metrics: Total active recipes, average gross margin %, portfolio batch profitability, and low-margin warnings.
- Quick navigation shortcuts to recipe creation and inventory synchronization.

---

## 📂 Project Structure

```
pricing-calculator/
├── README.md                      # Comprehensive application documentation
├── index.html                     # Web entry point
├── package.json                   # Frontend dependencies and build scripts
├── vite.config.ts                 # Vite bundler configuration
├── src/
│   ├── main.tsx                   # React root mount
│   ├── App.tsx                    # Route definitions and layout shell
│   ├── components/
│   │   ├── layout/                # Sidebar, Navbar, and Header navigation
│   │   └── ui/                    # Reusable primitives (Card, Modal, Tooltip, Spinner)
│   ├── context/                   # Global application state (currency formatting, theme)
│   ├── lib/
│   │   └── api.ts                 # Strongly typed Tauri IPC wrapper functions
│   └── pages/
│       ├── Dashboard.tsx          # Executive KPI overview & profit metrics
│       ├── Recipes.tsx            # Recipe catalog, filtering & New Recipe wizard
│       ├── RecipeBuilder.tsx      # Costing studio, inline table & channel pricing
│       ├── Ingredients.tsx        # Raw material pantry & unit costs
│       ├── AuditLogs.tsx          # Transactional and update history
│       └── Settings.tsx           # Application configuration & theme options
└── src-tauri/
    ├── Cargo.toml                 # Rust dependencies (Tauri, rusqlite, serde)
    ├── tauri.conf.json            # Tauri v2 desktop window & bundle configuration
    └── src/
        ├── lib.rs                 # Tauri application setup and command registration
        ├── main.rs                # Desktop entry point
        ├── commands.rs            # IPC command handlers & request validation
        ├── db.rs                  # SQLite connection pool & schema migrations
        └── models.rs              # Domain structs & pure costing calculation engine
```

---

## 🚀 Getting Started & Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0 or later)
- [Rust & Cargo](https://rustup.rs/) (stable channel)
- OS Build Tools:
  - **Windows**: Microsoft C++ Build Tools / Visual Studio 2022 C++ workload

### Installation
Clone the repository and install frontend dependencies:
```bash
cd pricing-calculator
npm install
```

### Running in Development
To run the full desktop application with Tauri IPC and hot reloading:
```bash
npm run tauri dev
```

To run only the web frontend interface (mock or browser testing):
```bash
npm run dev
```

### Building for Production
To bundle the production desktop installer (`.msi` / `.exe` on Windows):
```bash
npm run tauri build
```

To compile and check frontend static assets:
```bash
npm run build
```

---

## 🧪 Verification & Quality Assurance

The codebase enforces strict end-to-end quality standards:

1. **Frontend Type Checking & Bundling**:
   ```bash
   npm run build
   ```
   *Executes `tsc` type-checking followed by `vite build` with zero type errors.*

2. **Backend Rust Compilation**:
   ```bash
   cd src-tauri
   cargo check
   ```

3. **Backend Unit & Integration Tests**:
   ```bash
   cd src-tauri
   cargo test
   ```
   *Validates mathematical precision for batch costing, line extensions, and margin calculations.*

---

## 📝 Recent Implementation Changelog

| Date | Scope | Deliverables & Relevant Changes |
| :--- | :--- | :--- |
| **2026-09-25** | `RecipeBuilder.tsx` | Complete modern UI/UX redesign matching executive reference design: glassmorphic cards, dynamic Target Gap Alert banner, inline editable batch quantities, visual overhead distribution bar, base unit cost highlight card, quick markup simulations (+Current, +Optimal, +Premium), and interactive retail markup tooltip. |
| **2026-09-25** | `Recipes.tsx` | Redesigned Recipe Master with responsive card grid and table views, search & category filters, and high-fidelity 4-step New Recipe creation modal with live financial previews. |
| **2026-09-25** | Domain Math Audit | Validated and standardized all pricing formulas across `models.rs`, `commands.rs`, and frontend consumers to eliminate arbitrary mock formulas and enforce commercial costing rules. |
| **2026-09-25** | `Ingredients.tsx` | Complete modern UI/UX redesign matching uploaded reference: 4 Executive KPI cards (Total Ingredients, Fully Costed with progress bar, Needs Supplier Pricing alert, Benchmark Normalized Cost), ⌘K search & filter pills, 9-column data table with category badges, initial avatars, inline selection, bulk price adjustments, CSV export, and glassmorphic Add/Edit modal. |
| **2026-09-25** | Theme & Dark Mode | Resolved root-cause issue where theme toggling failed to switch background colors in `Recipes.tsx` and across the app. Added `@custom-variant dark (&:where(.dark, .dark *));` to `src/index.css` to switch Tailwind v4's `dark:` variant from OS media query to `.dark` class selector, and updated container background tokens to `bg-slate-50 dark:bg-[#080c14]`. |
| **2026-09-25** | Documentation | Overhauled `README.md` to reflect complete architecture, mathematical specifications, workflow guides, and development instructions. |
| **2026-09-25** | **Luminous Light Edition Redesign** | Comprehensive light mode visual redesign across all screens (`RecipeBuilder.tsx`, `Ingredients.tsx`, `Recipes.tsx`, `Dashboard.tsx`, and `index.css`). Shifted to an airy `#f8fafc` canvas with crisp white cards (`#ffffff`), subtle borders (`#e2e8f0`), culinary green brand highlights (`#16a34a` / `emerald-600`), high-contrast slate typography (`#0f172a`), professional amber Target Gap alert banner, leaf green active filter pills, bold emerald normalized costs, and `#f8fafc` overhead insets. |

