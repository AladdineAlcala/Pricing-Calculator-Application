# Architectural Analysis & Complexity Verification: Packaging Management System

**Document Version**: 1.0.0  
**Status**: DRAFT / ARCHITECTURAL REVIEW  
**Author**: `/solution-architect-business-planner` (Top-Level Principal Solution Architect & Business Analyst)  
**Initiative**: Add Independent Packaging Management to BakeIQ Desktop Application  
**Target Specification**: `.vscode/files/Packaging Management —Business Solution Plan.md`  
**Target Architecture**: React 19 + TypeScript + Tauri 2.x + Rust (rusqlite) + SQLite  

---

## 1. Executive Summary & Architectural Evaluation

### 1.1 Business Intent & Scope
The objective is to introduce **Packaging Management** into BakeIQ as a distinct, first-class cost and inventory material without destabilizing or refactoring the existing ingredient, recipe, or inventory subsystems. 

The core principle established in the specification is:
> *"Packaging is a separate cost item from Ingredients, but follows the existing costing and inventory business workflow wherever possible."*

### 1.2 Architectural Verdict: Feasibility & Complexity Rating
- **Overall Architectural Complexity**: **MEDIUM (Level 3 / 5)**
- **System Touchpoints**: 4 distinct layers (SQLite Relational Store, Rust Cost & Production Engine, Tauri IPC Bridge, React 19 UI/UX).
- **Breaking Change Risk**: **VERY LOW (Additive Pattern)**. Because packaging is isolated in dedicated tables (`packaging`, `recipe_packaging`, `packaging_transactions`), existing ingredient schemas, conversions, and recipes remain strictly backward-compatible.
- **Implementation Strategy**: Phased Directed Acyclic Graph (DAG) starting with persistence schema, followed by pure Rust domain math, IPC routing, TypeScript synchronization, and finally UI presentation with automated E2E adversarial tests.

---

## 2. Domain & Mathematical Costing Models

### 2.1 Separation of Concerns: Ingredients vs. Packaging
| Architectural Dimension | Ingredient Entity | Packaging Entity |
| :--- | :--- | :--- |
| **Physical Identity** | Consumed into recipe batter/dough | Encapsulates finished baked goods |
| **Unit System** | Multi-unit conversion (g, kg, cup, ml, tsp) | Discrete packaging units (pc, box, sheet, clamshell) |
| **Density / USDA Engine**| Requires volumetric-to-mass normalization | Constant unit pricing (no density conversion) |
| **Cost Formula** | `Recipe Qty * Normalized Base Cost` | `Batch Qty * Current Unit Cost` |
| **Stock Movement** | Perpetual inventory with purchase receipts | Perpetual inventory with stock receipts |

### 2.2 Mathematical Formulations

#### Packaging Line Item Cost:
$$\text{Line Packaging Cost}_i = \text{Batch Required Qty}_i \times \text{Current Unit Cost}_i$$

#### Total Packaging Cost per Recipe Batch:
$$\text{Total Packaging Cost} = \sum_{i=1}^{n} \text{Line Packaging Cost}_i$$

#### Total Variable Recipe Cost:
$$\text{Total Variable Cost} = \text{Total Ingredient Cost} + \text{Total Packaging Cost}$$

#### Total Cost per Batch:
$$\text{Total Cost per Batch} = \text{Total Variable Cost} + \text{Total Overhead (Labor + Electric + Other)}$$

#### Cost per Product / Salable Unit:
$$\text{Cost per Item} = \frac{\text{Total Cost per Batch}}{\text{Yield Qty}}$$

#### Downstream Profitability Propagation:
$$\text{Recommended Retail Price} = \text{Cost per Item} \times \left(1 + \frac{\text{Target Markup \%}}{100}\right)$$
$$\text{Gross Profit per Item} = \text{Recommended Retail Price} - \text{Cost per Item}$$
$$\text{Gross Margin \%} = \left(\frac{\text{Gross Profit per Item}}{\text{Recommended Retail Price}}\right) \times 100$$
$$\text{Gross Profit per Batch} = (\text{Recommended Retail Price} \times \text{Yield Qty}) - \text{Total Cost per Batch}$$

> **Financial Invariant**: If a recipe has 0 packaging items assigned, $\text{Total Packaging Cost} = 0.00$, yielding an exact $1:1$ parity with the pre-existing costing calculation.

---

## 3. Detailed Touchpoints & Impact Surface Analysis

### 3.1 Layer 1: Data Persistence (SQLite & `db.rs`)
1. **`packaging` Table**:
   - Stores packaging catalog items, default units, current costs, reorder levels, and stock balances.
   - Enforces unique `packaging_code`.
   - Soft-delete strategy via `is_active INTEGER NOT NULL DEFAULT 1` to preserve historical integrity.
2. **`recipe_packaging` Junction Table**:
   - Connects recipes to packaging with `batch_qty`.
   - Foreign keys: `recipe_id` (CASCADE on delete), `packaging_id` (RESTRICT on delete if active in recipes).
   - `UNIQUE(recipe_id, packaging_id)` constraint prevents accidental duplicate bindings.
3. **`packaging_transactions` Table**:
   - Immutable audit ledger recording:
     - `IN`: Deliveries/Receipts with unit purchase price.
     - `OUT`: Batch production runs referencing the recipe ID and batches produced.
4. **Seed Migration**:
   - Auto-seed the 12 master packaging items defined in Section 5 (Banana Muffin Liner, Banana Muffin Box, Custard Clamshell, etc.) idempotently.

### 3.2 Layer 2: Rust Domain & IPC Engine (`models.rs`, `commands.rs`)
1. **Contract Definitions (`models.rs`)**:
   - `Packaging`, `PackagingInput`, `RecipePackaging`, `RecipePackagingInput`.
   - `PackagingLedgerItem`, `PackagingTransaction`, `ReceivePackagingPayload`.
   - Extend `RecipeCostResult` to include `packaging_items: Vec<RecipePackaging>` and `total_packaging_cost: f64`.
   - Extend `StockDeficit` to support packaging identification (`item_type: "ingredient" | "packaging"`).
2. **Cost Calculation Engine (`commands.rs::calculate_recipe_cost`)**:
   - Query `recipe_packaging` joined with `packaging`.
   - Calculate line-item packaging costs and accumulate `total_packaging_cost`.
   - Feed `total_packaging_cost` directly into `total_variable_cost` and batch cost rollup.
3. **Production Engine (`commands.rs::produce_batch_with_validation`)**:
   - **Unified Pre-flight Deficit Interception**:
     - Evaluate both ingredient requirements and packaging requirements simultaneously.
     - If either ingredients or packaging lack sufficient on-hand inventory, generate an aggregated `ProductionError` containing the complete list of deficits.
   - **Atomic Deduction Transaction**:
     - Wrap ingredient stock updates, packaging stock updates, and transaction log inserts into a single SQLite transaction (`conn.transaction()`).
     - Zero stock leakage: If any step fails, the entire transaction rolls back cleanly.

### 3.3 Layer 3: Client API Bridge (`src/lib/api.ts`)
- Symmetric TypeScript interface exports:
  - `Packaging`, `PackagingInput`, `RecipePackaging`, `RecipePackagingInput`
  - `PackagingLedgerItem`, `PackagingTransaction`, `ReceivePackagingPayload`
  - Updated `RecipeCostResult` containing `packaging_items` and `total_packaging_cost`.
- Strongly typed Tauri invocations:
  - `getPackagingList()`, `createPackaging()`, `updatePackaging()`, `deactivatePackaging()`
  - `getRecipePackaging(recipeId)`, `upsertRecipePackaging(payload)`, `removeRecipePackaging(id)`
  - `receivePackagingStock(payload)`, `getPackagingLedger()`, `getPackagingTransactions()`

### 3.4 Layer 4: Presentation Layer UI/UX (React 19)
1. **Packaging Catalog & Inventory Management (`src/pages/Inventory.tsx` / Sub-tab)**:
   - Provide an ergonomic Segmented Control / Tab Switcher: `[ Ingredients ] | [ Packaging ]`.
   - Packaging view presents:
     - KPI Summary: Total Packaging Stock Value, Reorder Alerts, Active SKUs.
     - Interactive Data Table: Code, Name, Type, Unit, Cost, Stock, Status (Normal / Reorder), Actions.
     - Search & Filter bar (Type filter, Status filter).
     - "Stock-In Packaging" modal (Receive delivery, update cost, increment balance).
2. **Recipe Builder Integration (`src/pages/RecipeBuilder.tsx`)**:
   - Dedicated **Recipe Packaging Section** positioned beneath Recipe Ingredients.
   - Table displaying: Packaging Item, Type, Qty / Batch, Unit Cost, Total Cost, Actions.
   - "Add Packaging" Modal with search filter and batch quantity input.
   - Real-time Cost Summary widget displaying explicit breakdown:
     - Ingredients Subtotal: $\text{₱}XX.XX$
     - Packaging Subtotal: $\text{₱}YY.YY$
     - Overhead Subtotal: $\text{₱}ZZ.ZZ$
     - Batch Total: $\text{₱}WW.WW$
3. **Production Panel & Deficit Handling (`src/components/ProductionTriggerPanel.tsx`)**:
   - Display packaging requirements alongside ingredient requirements when planning batch runs.
   - If stock is insufficient, present a unified deficit modal highlighting whether an ingredient or packaging is short, with a 1-click action to receive stock.

---

## 4. Complexity Verification Matrix

| Area | Complexity | Rationale | Risk Mitigation |
| :--- | :---: | :--- | :--- |
| **Database Schema** | **Low-Medium (2/5)** | Simple relational structure; standard 1:N and N:M patterns. | Idempotent migrations (`CREATE TABLE IF NOT EXISTS`), proper indexing on foreign keys. |
| **Costing Engine** | **Low (1.5/5)** | Direct linear multiplication (`batch_qty * unit_cost`). No complex UOM conversion trees. | Maintain unrounded `f64` precision until display boundaries. |
| **Production Atomic Deduction** | **Medium-High (3.5/5)** | Must atomically check and deduct two distinct entity tables within one ACID transaction. | Use `conn.transaction()`, check all deficits upfront, execute updates in a single transaction commit. |
| **API & Contract Symmetry**| **Low-Medium (2/5)** | Straightforward Rust $\leftrightarrow$ TypeScript DTO symmetry. | Strict contract-first definition; zero drift between `models.rs` and `api.ts`. |
| **UI/UX Ergonomics** | **Medium (3/5)** | Requires clean visual hierarchy to avoid cluttering `RecipeBuilder` and `Inventory`. | Tabbed navigation on Inventory page; distinct packaging card in RecipeBuilder; reusable modals. |
| **End-to-End Verification** | **Medium (3/5)** | Requires adversarial validation of stock deficits, production rollbacks, and cost updates. | Playwright suite using transient SQLite instance covering all multi-batch scenarios. |

---

## 5. Topological Work Breakdown Structure (DAG WBS)

```
[Phase 1: Persistence Schema & Seed Data]
              │
              ▼
[Phase 2: Rust Domain Costing & Production Engine]
              │
              ▼
[Phase 3: Tauri IPC Commands & TypeScript API Bridge]
              │
              ▼
[Phase 4: React UI/UX Implementation (Inventory & RecipeBuilder)]
              │
              ▼
[Phase 5: Adversarial E2E Verification (Playwright Suite)]
              │
              ▼
[Phase 6: Static Code Review & Quality Gatekeeper (code-reviewer)]
```

### Detailed Task DAG:
- **Task 1.1** [Fullstack]: Implement SQLite tables (`packaging`, `recipe_packaging`, `packaging_transactions`) and seed data in `src-tauri/src/db.rs`.
- **Task 2.1** [Fullstack]: Author Rust DTOs and structs in `src-tauri/src/models.rs`.
- **Task 2.2** [Fullstack]: Extend `calculate_recipe_cost` in `src-tauri/src/commands.rs` to compute packaging line costs and total cost rollup.
- **Task 2.3** [Fullstack]: Extend `produce_batch_with_validation` in `src-tauri/src/commands.rs` to validate packaging inventory and execute atomic deductions.
- **Task 2.4** [Fullstack]: Author unit test suites in `models.rs` and `commands.rs` validating packaging cost math and deficit rejection.
- **Task 3.1** [Fullstack]: Implement IPC command handlers (`get_packaging_list`, `upsert_recipe_packaging`, `receive_packaging_inventory`, etc.).
- **Task 3.2** [Fullstack]: Update `src/lib/api.ts` with exact symmetric TypeScript contracts and invoke methods.
- **Task 4.1** [Frontend]: Build Packaging Inventory tab and Stock-In delivery modal in `src/pages/Inventory.tsx`.
- **Task 4.2** [Frontend]: Build Packaging Management Section and "Add Packaging" modal in `src/pages/RecipeBuilder.tsx`.
- **Task 4.3** [Frontend]: Update Cost Summary & Production Trigger Panel to display packaging subtotal and handle packaging deficits.
- **Task 5.1** [QA Adversarial]: Author Playwright E2E test suite in `e2e/packaging.spec.ts` attacking packaging stockouts, batch production, and cost recalculations.
- **Task 6.1** [Reviewer]: Static analysis, clippy, lint, zero-console-log audit, and final quality sign-off.

---

## 6. Risk Register & Anti-Failure Policies

| Risk Description | Severity | Probability | Defensive Countermeasure |
| :--- | :---: | :---: | :--- |
| **Stock Deduction Race Condition** | High | Low | SQLite transaction lock during `produce_batch_with_validation`. SQLite in WAL mode ensures thread-safe sequential writes. |
| **Historical Data Mutation** | Medium | Medium | Unit cost updates in `packaging` do NOT mutate past `packaging_transactions`. Past production batches retain historical unit costs. |
| **Accidental Deletion of Used Packaging**| High | Low | Enforce foreign key constraints or soft-delete (`is_active = 0`). Prevent deletion if referenced in `recipe_packaging`. |
| **Cost Inconsistency in Recipe Listing** | Medium | Low | Ensure `get_recipes` summary queries incorporate packaging cost into `ingredient_cost` / total cost columns. |

---

## 7. Architectural Recommendation & Conclusion
The proposed Packaging Management feature is well-specified, logically sound, and directly compatible with BakeIQ's existing desktop architecture. By maintaining strict physical separation between ingredients and packaging at the persistence layer, the feature introduces minimal regression risk while delivering critical unit costing accuracy for bakery operations.
