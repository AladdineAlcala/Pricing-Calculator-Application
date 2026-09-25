---
name: solution-architect-business-planner
description: >-
  Expert guidance for Senior Business Analyst, Solution Architect, and Project Planner specializing in pricing systems, business process analysis, requirement decomposition, system modeling, architecture blueprints, sprint planning, and full-lifecycle application development.
---

# Senior Business Analyst, Solution Architect & Project Planner Skill

This skill guides end-to-end product architecture, business requirements elicitation, pricing domain modeling, system architecture design, and actionable project execution roadmaps.

---

## 🎯 When to Use This Skill
- Decomposing business goals, user requests, or messy specifications into structured Functional Requirements (FRs) and Acceptance Criteria.
- Designing or auditing pricing engines, cost models, overhead allocation systems, and profit margin formulas.
- Formulating technical solution architectures across the stack (React/TypeScript, Tauri/Rust, SQLite, IPC contracts).
- Mapping As-Is vs To-Be business processes, data flows, and workflow state machines.
- Creating Actionable Sprint Backlogs, Work Breakdown Structures (WBS), and phase-gated execution roadmaps.
- Performing technical feasibility assessments, architectural tradeoff analyses (ADRs), and risk mitigation plans.

---

## 📐 The 4 Core Disciplines

### 1. Business Process & Pricing Systems Analysis
When analyzing business workflows or pricing models:
- **Unit Economics & Cost Decomposition**:
  - Direct Material Costs (Ingredients, packaging, consumables).
  - Variable & Fixed Overhead (labor rates, energy/utilities, equipment wear, batch setup).
  - Yields & Wastage factors (raw batch input vs net salable output units).
- **Margin vs Markup Modeling**:
  - Clearly distinguish Markup ($\frac{\text{Price} - \text{Cost}}{\text{Cost}} \times 100$) from Gross Margin ($\frac{\text{Price} - \text{Cost}}{\text{Price}} \times 100$).
  - Multi-tier distribution channels: Direct Retail (B2C), Reseller / Wholesale (B2B), Bulk Distributor.
  - Break-Even Analysis: $\text{Break-Even Units} = \frac{\text{Fixed Overhead}}{\text{Unit Price} - \text{Unit Variable Cost}}$.
- **As-Is $\rightarrow$ To-Be Process Mapping**:
  - Identify human friction points, data duplication, calculation bottlenecks, and margin leakages.

### 2. Solution Architecture & Technical Design
When architecting features or systems:
- **Domain-Driven Design (DDD)**:
  - Separate Domain Costing Math, Persistence Layer, IPC Command Handlers, and UI Presentation.
  - Strict type contracts between Rust backend models and TypeScript frontend interfaces.
- **Financial & Data Precision**:
  - Guard against floating-point rounding drifts. Specify rounding conventions (Half-Up, 2 decimals for currency, 1-2 for percentages).
  - Defensive database integrity: Foreign keys, cascade rules, atomic transactions for multi-entity updates (e.g. recipe + ingredient relations).
- **Architecture Decision Records (ADRs)**:
  - Context $\rightarrow$ Decision $\rightarrow$ Consequences $\rightarrow$ Alternatives Considered.

### 3. Requirements Engineering & Specification
- Format user stories with context and value proposition:
  > **As a** [user persona / bakery manager],  
  > **I want to** [action / configure overhead rates],  
  > **So that** [business outcome / accurate retail margins are guaranteed].
- Provide unambiguous **Acceptance Criteria (Gherkin format)**:
  - `Given [precondition]`, `When [action]`, `Then [expected observable outcome]`.
- Define Boundary Conditions: 0 yield, negative inputs, missing ingredient costs, currency symbol localization.

### 4. Project Planning & Sprint Execution
- **Work Breakdown Structure (WBS)**: Group tasks by Layer (Database/Schema $\rightarrow$ Rust IPC Commands $\rightarrow$ API Client $\rightarrow$ React Components $\rightarrow$ Verification).
- **MoSCoW Prioritization**: Must-Have (Critical path), Should-Have (High value), Could-Have (Delight), Won't-Have (Post-MVP).
- **Actionable Sprint Backlog**:
  - Deliverable definition, technical files impacted, verification commands, and risk matrix.

---

## 📋 Quality & Architecture Review Checklist
- [ ] Financial math formulas explicitly defined with test vectors before code is written.
- [ ] Schema changes backed by migration strategy and backward compatibility.
- [ ] IPC / API boundary contracts typed end-to-end (zero untyped payloads).
- [ ] Edge cases modeled (zero yield, division by zero, empty catalogs, extreme decimal markup).
- [ ] Clear step-by-step verification commands (`cargo check`, `cargo test`, `npm run build`).
