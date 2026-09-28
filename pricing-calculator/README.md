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

### 5. Package Net Content & Secondary UOM Modeling
To eliminate costing inaccuracy and manual unit-conversion errors, raw material inventory decouples commercial containers (`package_type`: Box, Sack, Tub, Bottle, Can, etc.) from physical usable content (`net_quantity` and `net_unit`: g, kg, ml, L, pcs):

$$\text{Cost per Net Content Unit} = \frac{\text{Container Purchase Price}}{Q_{\text{net}}}$$
$$\text{Yield Factor (Recipe Units per Container)} = \frac{Q_{\text{net}}}{\text{Recipe Unit Mass or Density Benchmark}}$$
$$\text{Normalized Recipe Unit Cost} = \frac{\text{Container Purchase Price}}{\text{Yield Factor}}$$

**Commercial Example (1 Box of Butter @ 225g @ ₱120.00)**:
- $\text{Cost per Gram} = \frac{₱120.00}{225\text{ g}} = ₱0.5333\text{ / g}$
- With standard culinary butter density ($227\text{ g / cup}$):
  $$\text{Yield Factor} = \frac{225\text{ g}}{227\text{ g/cup}} = 0.9912\text{ cups per box}$$
- $\text{Normalized Cost per Cup} = \frac{₱120.00}{0.9912\text{ cups}} = ₱121.07\text{ / cup}$
- A recipe line calling for $0.5\text{ cups}$ evaluates to $0.5 \times ₱121.07 = ₱60.53$.

---

## 💻 Key Features & Screen Workflows

### 1. Recipe Builder Studio (`RecipeBuilder.tsx`)
- **Executive Glassmorphism & Header Hierarchy**: Breadcrumbs, recipe SKU, production status badge (`● Production Active`), and meta chips for Yield, Allocated Labor, Utilities, and Prep Time.
- **Dynamic Benchmark Gap Alert**: High-visibility amber banner highlighting margin deficits with direct "Adjust Target" modal trigger.
- **Interactive Ingredients Grid**:
  - Full financial breakdown: Purchase Price, Yield Factor, Normalized Unit Cost, Recipe Qty, and Line Cost.
  - Detailed packaging subtitle displaying container, net content, and real-time cost per net unit (e.g. `Box (225 g) • ₱0.53/g`).
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

### 3. Raw Material Pantry & Secondary UOM Studio (`Ingredients.tsx`)
- **Package Net Content Decoupling**: Full container typing (`Box`, `Sack`, `Tub`, `Carton`, `Bottle`, `Can`, `Pack`, `Case`) with independent net usable quantity and content unit (`g`, `kg`, `ml`, `L`, `pcs`, `oz`, `lb`).
- **Automated Density & Yield Synchronization**: Single-click `✨ Auto-Sync Yield` engine converting physical net content directly into formula units (`Cup`, `tsp`, `tbsp`, `Gram`, `ml`, `pc`) using culinary density constants (e.g. Butter 227g/cup, Flour 120g/cup, Sugar 200g/cup, Milk 240ml/cup).
- **One-Click Package Presets**: Presets for common bakery packaging (Butter Box 225g, Flour Sack 25kg, Sugar Bag 1kg, Milk Bottle 1L, Baking Powder Can 100g, Egg Flat 30pcs).
- **Real-Time Net Unit Cost Display**: Immediate visibility of unit costs per raw gram, milliliter, or piece alongside recipe portion cost.
- **Master Data Grid**: Enhanced table displaying container badges, net mass/volume, and net cost per unit.

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
   cargo check --tests
   ```

3. **Backend Unit & Integration Tests**:
   ```bash
   cd src-tauri
   cargo test --lib
   ```
   *Validates mathematical precision for package normalization, secondary UOM conversion, and backward compatibility.*

---

## 📝 Recent Implementation Changelog

| Date | Scope | Deliverables & Relevant Changes |
| :--- | :--- | :--- |
| **2026-09-26** | **Multi-Unit Architecture Update (Hierarchical 3-Entity System)** | Full-stack scaffolding and implementation of the Multi-Unit Architecture Update per [ApplicationDesignDocument.md](file:///d:/source/repos/Pricing%20Calculator%20Application/.vscode/files/ApplicationDesignDocument.md) and [Updated Data Model Design.md](file:///d:/source/repos/Pricing%20Calculator%20Application/.vscode/files/Updated%20Data%20Model%20Design.md): (1) **Relational Database Migration (`db.rs`)**: Created `ingredient_conversions` child table with `conversion_id INTEGER PRIMARY KEY AUTOINCREMENT`, foreign key referencing `ingredients(ingredient_id) ON DELETE CASCADE`, and index `idx_ingredient_conversions_ing`; altered `recipe_ingredients` to add `conversion_id INTEGER REFERENCES ingredient_conversions(conversion_id) ON DELETE SET NULL`; auto-populated default conversions for all existing ingredients and linked existing recipe items without data loss; updated demo seed data with realistic multi-unit conversion sets (Grams, Cups, Tablespoons) for Sugar, Flour, Butter, Milk, and Eggs; (2) **Pure Domain DTOs & Costing Math (`models.rs`)**: Added `IngredientConversion` and `IngredientConversionInput`; updated `Ingredient` (`conversions: Vec<IngredientConversion>`), `RecipeIngredient` (`conversion_id: Option<i64>`, `is_orphaned_conversion: bool`); added unit test `test_sugar_multi_unit_conversion_architecture` validating exact conversion mathematics (Sugar 1kg @ ₱80.00: 50g = ₱4.00, 0.25 cups = ₱4.00); (3) **Tauri IPC Command Layer (`commands.rs`)**: Updated `get_ingredients` to batch pre-load conversions in a single query map; updated `create_ingredient` and `update_ingredient` to synchronize child conversions transactionally; updated `get_recipes` and `get_recipe_ingredients` to resolve unit costs via `LEFT JOIN ingredient_conversions` and detect orphaned conversions (`is_orphaned = true`) with safe fallback to `i.recipe_unit` and `i.yield_factor`; updated `upsert_recipe_ingredient` to support `conversion_id`; (4) **TypeScript Client Bridge (`api.ts`)**: Added strongly typed `IngredientConversion` and `IngredientConversionInput`, updated `Ingredient`, `RecipeIngredient`, and `upsertRecipeIngredient`; (5) **Master-Detail Conversion Subgrid (`Ingredients.tsx`)**: Replaced static unit conversion inputs with an interactive multi-row conversion rules subgrid displaying Kitchen Recipe Unit, Yield Factor, live Normalized Micro-Cost (`₱XX.XX / unit`), auto-populate helper (`✨ Auto-Populate Standard Conversions`), and `+{n} units` badge on the master pantry table; (6) **Recipe Builder Cascading Unit Selector & Defensive UI (`RecipeBuilder.tsx`)**: Upgraded Add Ingredient modal to cascade available recipe units dynamically from `selectedIng.conversions`, compute live batch line cost based on the active conversion factor, and adapt presets (+50g, +100g, 1 Cup, 1 tbsp, etc.) to the active unit; in the formula table, implemented inline conversion switching and defensive warning badge `⚠️ Unit configuration missing. Please reselect.` with instant re-selection dropdown if a conversion rule is deleted; (7) **Quality Verification**: Verified 100% end-to-end type safety and compilation with `npm run build` and `cargo check --tests` (0 warnings, 0 errors). |
| **2026-09-26** | **Unified Global Sticky Footer System Rollout** | Redesigned the application layout and footer to maintain exactly 1 single, persistent sticky footer across all screens: (1) **Global Layout Shell (`App.tsx`)**: Mounted the single `<Footer />` component directly within the root application shell under the main content area (`flex-1 flex flex-col min-w-0 overflow-hidden relative`), ensuring the footer stays permanently docked at the bottom of the viewport across all 5 routes (`Dashboard`, `Ingredients`, `Recipes`, `RecipeBuilder`, `Settings`) while individual screens retain independent vertical scrolling; (2) **Deduplication (`Dashboard.tsx`)**: Removed redundant local `<Footer />` renders from the Dashboard loading skeleton and bottom section, alongside removing unused imports; (3) **Artisan Visual Craft & Telemetry**: Styled with glassmorphism (`bg-artisan-surface/95 dark:bg-[#0c101a]/95 backdrop-blur-md border-t border-artisan-border dark:border-slate-800`), live pulsing engine indicator (`BakeIQ Engine v3.2.0`), SQLite FIFO telemetry, and deterministic costing notices; (4) **Interactive Quick Tools**: Built-in interactive modals for Keyboard Shortcuts (with global `?` key listener) and Artisan Culinary Yield & Density Reference (Flour, Butter, Sugar, Milk, Cocoa, Eggs), alongside master specs export and encrypted local-first indicators; (5) **End-to-End Verification**: Confirmed 100% build validity (`npm run build` and `cargo check --tests`) and automated browser subagent verification across all views. |
| **2026-09-26** | **Recipe Master Database Reconnection & View Mode Fix** | Diagnosed and resolved the root cause of records missing on the Recipe Master screen (`Recipes.tsx`): (1) **Database Directory Reconnection**: Identified that renaming the Tauri app identifier from `com.pricingcalculator.app` to `com.bakeiq.app` caused Tauri's `app_data_dir()` to point to a new blank database with 0 recipes while the user's populated database (`BANANA BREAD`, `Spanish Bread`, 20 ingredients) resided in the legacy directory; (2) **Safe Data Migration**: Safely merged all recipes, recipe ingredients, and pantry items into `com.bakeiq.app\pricing_calculator.db` without data loss; (3) **Automatic Rust Migration**: Added `check_and_migrate_legacy_db` to `src-tauri/src/db.rs` and `lib.rs` to detect and migrate legacy databases automatically on startup; (4) **Frontend View Mode & Error Resilience**: Added `.catch()` and `.finally()` error recovery to `load()` in `Recipes.tsx`, implemented high-craft table layout when `viewMode === "list"` is toggled, and added page reset on search input. |
| **2026-09-26** | **Senior Full-Stack Engineer Agent System** | Established the dedicated **Senior Full-Stack Engineer — BakeIQ Desktop Application** persona, skill, and rules: (1) **Skill Definition**: Created `bakeiq-fullstack-engineer` (`.agents/skills/bakeiq-fullstack-engineer/SKILL.md`) covering React 19, TypeScript, Tauri 2.x, Rust, SQLite, Stitch design implementation, and pure costing domain mathematics; (2) **Workspace Rules**: Added `.agents/rules/bakeiq-fullstack-engineer.md` enforcing source-of-truth separation, existing-code-first analysis, reusable component architecture, and Rust/Tauri IPC boundaries; (3) **Agent Manifest**: Updated root `AGENTS.md` registering Role 3 to guide all future desktop development. |
| **2026-09-26** | **Universal Top Navigation Header Rollout** | Applied persistent top navigation `Header.tsx` across remaining core screens: (1) **`Ingredients.tsx`**: Integrated sticky Header with live `unpricedCount` alert bell, responsive telemetry indicators, and wrapped loading skeleton + main table container without layout shift; (2) **`Recipes.tsx`**: Integrated sticky Header with wired `onOpenNewRecipe={openCreateModal}` callback so "+ New Recipe" directly activates the 4-step creation modal from the top navigation bar, plus integrated Header in loading state; (3) **`Settings.tsx`**: Integrated sticky Header, restructured settings panels into artisan design system cards (`bg-artisan-surface dark:bg-[#0c101a] border-artisan-border dark:border-slate-800`), enhanced currency preview, tactile theme toggle, and updated system specs; (4) **Verification**: Full type-checking and bundling validated via `npm run build` (0 errors). |
| **2026-09-26** | **BakeIQ UI Redesign Implementation (Stitch Visual Specification)** | Implemented the high-fidelity Stitch-generated visual redesign into the existing React 19 application across the entire UI hierarchy: (1) **Brand Assets & Wordmark**: Created `BakeIQLogo.tsx` with authentic SVG mark (warm grain and emerald growth curve gradients, radial telemetry circle, and spark node), `BakeIQ` wordmark (`IQ` in culinary green), `PRO` caramel pill badge, and `Bakery Intelligence` uppercase subtext; (2) **Typography & Design Tokens**: Integrated `Plus Jakarta Sans` and `JetBrains Mono` from Google Fonts into `index.html`, added Tailwind v4 `@theme` tokens in `index.css` for `artisan` surfaces (`#FAF8F5`, `#FFFFFF`, `#F4EFEB`, `#E8E1D9`), `espresso` typography (`#1A120B` down to `#8C7362`), `culinary` greens (`#16A34A`), `caramel` ambers (`#F59E0B`), and custom elevation shadows (`shadow-artisan-subtle`, `shadow-artisan-card`, `shadow-artisan-glow`); (3) **Application Shell & Navigation**: Upgraded `Sidebar.tsx` with the authentic brand lockup, exact SVG icons, active state pill (`bg-culinary-600 text-white font-semibold text-sm` with white indicator dot), `Kitchen Dark Mode` toggle with `ON`/`OFF` badge, and `v3.2.0 • Real-Time FIFO` telemetry status; (4) **Header (TopBar)**: Built sticky `Header.tsx` featuring `Inventory & Costing` and `PHP (₱) Currency Active` badges, `Yield auto-sync active` indicator, `Search pantry items... ⌘K` command shortcut, `Manage Ingredients` action, `+ New Recipe` primary CTA, alert bell with pending price indicator, and `AB Artisan Bakeshop / Metro Kitchen #1` profile badge; (5) **Executive KPI Cards**: Redesigned the 4 KPI cards (`Total Ingredients`, `Active Recipes`, `Avg Target Markup`, `Pricing Coverage`) with artisan card containers, squircle icon badges, contextual link badges (`Pantry Master ↗`, `Cost Engine ↗`, `Target: 50%+ ↗`, `Action Required ↗`), and live progress bars; (6) **Elevated Onboarding Hero**: Implemented the launchpad card featuring decorative subtle warmth curves, central tuning/slider icon, headline, 3-step micro stepper (`Step 1 • Action` with pulsing amber dot, `Step 2 Assemble Recipe Formula`, `Step 3 Auto Gross Margin`), primary CTAs (`Set Ingredient Purchase Prices`, `Create First Recipe`), and interactive `Load Manila Artisan Bakery Seed Data` demo populator; (7) **Costing Telemetry Intelligence Architecture**: Added the 3-column telemetry preview covering `Standard Yield Pipeline` (4 visual step boxes: Bulk Rate, Normalized Unit Cost, Batch Allocation, Overhead/Labor), `Benchmark Bakery Cost Drivers` (proportional expense weight bars for Butter 38%, Flour 24%, Eggs/Dairy 18%, Sugar/Chocolate 14%), and `Target Margin Health Matrix` (Direct Retail Counter 55.0%, Wholesale Cafe 28.5%, and live readiness status); (8) **System Status Footer**: Added persistent `Footer.tsx` with engine telemetry status, interactive keyboard shortcuts modal, yield conversion reference tables modal, and master specs export link; (9) **Theme & Responsive Ergonomics**: Verified full light and dark mode parity, seamless theme transitions, and responsive mobile/tablet breakpoints with zero layout shift. |
| **2026-09-26** | **Purchase Price Input Width & Container Visibility Fix** | Resolved text clipping and layout crowding on the `id="purchase-price"` input container in Add/Edit Ingredient modal (`Ingredients.tsx`): (1) Applied `min-w-0 flex-1` and disabled default WebKit/Chromium numeric spinner arrows on the `<input id="purchase-price">` to prevent intrinsic input minimum width from forcing flex sibling out of the container; (2) Added `shrink-0` and `whitespace-nowrap` alongside contextual tooltip to the suffix badge (`PHP / {form.packageType}`), guaranteeing the package label and currency suffix remain 100% visible without text truncation or overflow clipping; (3) Streamlined currency prefix spacing to `px-3 select-none`. |
| **2026-09-26** | **Modal Form Alignment Fix** | Fixed height and vertical alignment for `CONTAINER PURCHASE PRICE` and the adjacent `CALCULATED NET UNIT COST` metric component in both Add New Ingredient and Edit Ingredient modals (`Ingredients.tsx`): (1) Enforced uniform `h-[42px]` component height matching other form inputs; (2) Added matching upper label headers and uppercase typography to both columns, eliminating the vertical displacement; (3) Added synchronized lower helper text (`text-[11px]`), ensuring clean top-to-bottom pixel alignment across both columns. |
| **2026-09-25** | **Add Ingredient to Recipe Modal Redesign** | Modernized the "Add Ingredient to Recipe" modal in `RecipeBuilder.tsx` to match the executive design specification: (1) **Header & Branding**: Emerald plus icon badge, `₱ PHP` active currency indicator, clear contextual subtitle, and responsive close button; (2) **Search & Category Filters**: Search bar with real-time match counter (`X items matching "query"`), clear button, `⌘K` keyboard shortcut pill, and category filter pills (`All Pantry`, `Sweeteners (X)`, `Baking & Grains`, `Dairy & Fats`, `Produce`); (3) **Inventory Items List**: High-contrast radio selection list with unpriced (amber) and selected (emerald) badges, package & yield specifications, and normalized master unit cost; (4) **Loading Skeletons**: 4 shimmer skeleton rows during search transitions and modal initialization; (5) **Portion Configuration Drawer**: Real-time master unit cost reference, batch quantity stepper with tactile decrement (`-`) and increment (`+`) buttons, measure unit selector, one-touch contextual presets (`+50g`, `+100g`, `250g`, `1 Cup`) with active state detection, and live `Batch Line Cost: ₱XX.XX` pill badge; (6) **Tactile Ergonomics & Double-Submit Defense**: Primary button click depth (`active:scale-[0.98] active:translate-y-0.5`), disabled state when saving or invalid, and async loading spinner; (7) **Floating Toast Notifications**: Auto-dismissing (3.8s) floating toast confirming added ingredient portion and line item total with `CheckCircle2` feedback; (8) **Theme Hygiene**: Full adaptation across Luminous Light Edition (`#f8fafc` / `#ffffff`) and Dark Mode (`#0c101a` / `#141b2c`). |
| **2026-09-25** | **UI/UX Micro-Interactions & Skeletons** | Added polished tactile ergonomics to `Ingredients.tsx`: (1) High-fidelity shimmer loading skeleton (`IngredientsSkeleton`) eliminating layout shift; (2) Tactile button click depth (`active:scale-[0.98] active:translate-y-0.5 shadow-sm active:shadow-none`); (3) Async loading indicator & double-submission prevention (`disabled={saving}`) on Save buttons with rotating spinner; (4) Floating toast notification system with auto-dismiss (3.8s) for successful ingredient creations, edits, bulk adjustments, and deletions. |
| **2026-09-25** | **Package Net Content & Secondary UOM System** | Full-stack scaffolding and implementation of the Package Net Content & Secondary UOM Engine: (1) SQLite schema migration adding `package_type`, `net_quantity`, and `net_unit` with safe backward-compatible defaults; (2) Rust DTOs (`models.rs`), IPC commands (`commands.rs`), and unit test suite verifying mathematical normalization for butter box (225g), flour sack (25kg), and legacy JSON compatibility; (3) TypeScript API layer (`api.ts`); (4) Modernized Add/Edit modal in `Ingredients.tsx` featuring 3-part package container selection, net quantity, secondary content unit, live cost-per-net-unit calculation, single-click culinary density auto-sync (`✨ Auto-Sync Yield`), and one-touch package presets; (5) Enhanced master table and RecipeBuilder line item badges displaying container, net mass/volume, and net cost per unit. |
| **2026-09-25** | `RecipeBuilder.tsx` | Complete modern UI/UX redesign matching executive reference design: glassmorphic cards, dynamic Target Gap Alert banner, inline editable batch quantities, visual overhead distribution bar, base unit cost highlight card, quick markup simulations (+Current, +Optimal, +Premium), and interactive retail markup tooltip. |
| **2026-09-25** | `Recipes.tsx` | Redesigned Recipe Master with responsive card grid and table views, search & category filters, and high-fidelity 4-step New Recipe creation modal with live financial previews. |
| **2026-09-25** | Domain Math Audit | Validated and standardized all pricing formulas across `models.rs`, `commands.rs`, and frontend consumers to eliminate arbitrary mock formulas and enforce commercial costing rules. |
| **2026-09-25** | `Ingredients.tsx` | Complete modern UI/UX redesign matching uploaded reference: 4 Executive KPI cards (Total Ingredients, Fully Costed with progress bar, Needs Supplier Pricing alert, Benchmark Normalized Cost), ⌘K search & filter pills, 9-column data table with category badges, initial avatars, inline selection, bulk price adjustments, CSV export, and glassmorphic Add/Edit modal. |
| **2026-09-25** | Theme & Dark Mode | Resolved root-cause issue where theme toggling failed to switch background colors in `Recipes.tsx` and across the app. Added `@custom-variant dark (&:where(.dark, .dark *));` to `src/index.css` to switch Tailwind v4's `dark:` variant from OS media query to `.dark` class selector, and updated container background tokens to `bg-slate-50 dark:bg-[#080c14]`. |
| **2026-09-25** | Documentation | Overhauled `README.md` to reflect complete architecture, mathematical specifications, workflow guides, and development instructions. |
| **2026-09-25** | **Luminous Light Edition Redesign** | Comprehensive light mode visual redesign across all screens (`RecipeBuilder.tsx`, `Ingredients.tsx`, `Recipes.tsx`, `Dashboard.tsx`, and `index.css`). Shifted to an airy `#f8fafc` canvas with crisp white cards (`#ffffff`), subtle borders (`#e2e8f0`), culinary green brand highlights (`#16a34a` / `emerald-600`), high-contrast slate typography (`#0f172a`), professional amber Target Gap alert banner, leaf green active filter pills, bold emerald normalized costs, and `#f8fafc` overhead insets. |

