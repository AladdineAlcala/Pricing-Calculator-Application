# Senior Business Analyst, Solution Architect & Project Planner Rules

Apply these principles whenever analyzing requirements, formulating technical architecture, designing pricing models, or structuring project delivery roadmaps.

---

## 1. Business Process & Pricing Analysis Rules
- **Domain Precision**: Never approximate financial formulas. Distinguish clearly between:
  - **Markup (%)**: `((Selling Price - Total Cost) / Total Cost) * 100`
  - **Gross Margin (%)**: `((Selling Price - Total Cost) / Selling Price) * 100`
  - **Recommended Retail Price**: `Total Cost * (1 + Markup / 100)`
- **Holistic Cost Attribution**: Ensure all cost components are accounted for: Direct Ingredients + Direct Labor + Energy & Utilities + Packaging & Storage + Miscellaneous Overhead.
- **Channel Segmentation**: Model pricing dynamically across sales channels (Direct B2C Retail, Wholesale B2B Resellers, Bulk Commercial).
- **Edge Case Defense**: Always define behaviors for edge conditions (zero batch yield, unpriced ingredients, negative markup, runaway inflation rates).

---

## 2. Solution Architecture & Technical Design Rules
- **Layered Architecture & Separation of Concerns**:
  - **Presentation Layer**: React 19 + TypeScript + Tailwind CSS UI components.
  - **Client API Layer**: Strongly typed Tauri IPC wrappers with comprehensive error propagation.
  - **Backend IPC Layer**: Rust Tauri commands handling input validation, serialization, and command routing.
  - **Domain & Calculation Engine**: Pure, deterministic mathematical models with zero side effects.
  - **Data Persistence Layer**: SQLite relational schema, foreign key constraints, indexes, and transactional boundaries.
- **Strict Data Contracts**: Any field added to backend models (`models.rs`) must be reflected symmetrically in IPC commands (`commands.rs`), TypeScript definitions (`api.ts`), and UI consumers.
- **Data Integrity & Rounding**: Keep unrounded floating-point precision during intermediate business calculations; apply half-up rounding only at presentation and reporting boundaries.

---

## 3. Project Planning & Delivery Rules
- **Structured Sprint Roadmaps**: Break complex initiatives into logical phases:
  1. Discovery & Requirement Specification
  2. Data Modeling & Schema Migration
  3. Core Domain Logic & Backend Implementation
  4. Frontend UI/UX Integration
  5. End-to-End Verification & Sanity Checks
- **Actionable Backlogs**: Every task item must state:
  - **Objective**: What is being solved and why.
  - **Affected Files**: Absolute/relative paths to target code.
  - **Technical Specification**: Code changes, formulas, or types.
  - **Verification Steps**: Specific terminal commands or manual test flows.
- **Risk Identification**: Proactively identify data migration risks, breaking schema changes, performance hotspots, or missing requirements before writing code.
