# Packaging Management — Final Business Solution Plan

## 1. Purpose

Add **Packaging Management** to the existing Recipe Costing and Inventory system without reimplementing any existing ingredient, recipe, production, or inventory functionality.

Packaging will be managed separately from Ingredients but will participate in:

* Recipe costing
* Production consumption
* Inventory monitoring
* Packaging stock tracking
* Recipe profitability calculations

### Core principle

> **Packaging is a separate cost item from Ingredients, but follows the existing costing and inventory business workflow wherever possible.**

---

# 2. Scope

### Included

1. Packaging Master
2. Packaging Types
3. Packaging assignment to Recipes
4. Packaging Cost calculation
5. Packaging Stock-In
6. Packaging Stock-Out during production
7. Packaging inventory monitoring
8. Packaging consumption history
9. Integration of packaging cost into existing Recipe Cost
10. Integration of packaging consumption into existing Production

### Not Included

The following existing functionality will **not be redesigned or reimplemented**:

* Ingredient management
* Ingredient conversion
* Existing recipe management
* Existing ingredient costing
* Existing ingredient inventory
* Existing production workflow
* Existing sales/revenue calculations
* Existing dashboard
* Accounting
* Supplier management
* Purchase orders
* Lot/batch tracking
* FIFO costing
* Finished goods inventory

---

# 3. Business Concept

The system will treat the following as separate materials:

| Material   | Purpose                              | Example               |
| ---------- | ------------------------------------ | --------------------- |
| Ingredient | Becomes part of the product          | Flour, sugar, banana  |
| Packaging  | Used to package the finished product | Box, liner, container |

Both contribute to the final recipe cost.

### Example

A Banana Muffin recipe may require:

**Ingredients**

* Flour
* Sugar
* Banana
* Eggs
* Butter

**Packaging**

* Banana Muffin Liner
* Banana Muffin Box

The final recipe cost becomes:

> **Total Recipe Cost = Ingredient Cost + Packaging Cost**

---

# 4. Packaging Master

The Packaging Master is the central list of all packaging materials used by the business.

## 4.1 Packaging Information

Each packaging item should contain:

| Information       | Description                 |
| ----------------- | --------------------------- |
| Packaging Code    | Unique business identifier  |
| Packaging Name    | Name of the packaging       |
| Packaging Type    | Box, liner, container, etc. |
| Unit              | Piece, box, sheet, etc.     |
| Current Unit Cost | Current cost of one unit    |
| Reorder Level     | Minimum desired stock level |
| Active Status     | Active or inactive          |

---

# 5. Initial Packaging Data

The following packaging items should be available as initial master data:

| Packaging                      |  Unit | Unit Cost |
| ------------------------------ | ----: | --------: |
| Banana Muffin Liner            | Piece |     ₱2.00 |
| Banana Muffin Box              | Piece |    ₱15.00 |
| Banana Bread Box               |   Box |    ₱15.00 |
| Custard Clamshell              | Piece |     ₱8.00 |
| Ensaymada Sheet                | Sheet |     ₱1.00 |
| Cupcake Liner                  | Piece |     ₱1.00 |
| Yema Cake Container            | Piece |     ₱6.00 |
| Mammon Liner                   | Piece |     ₱1.00 |
| Spanish Bread Packaging        | Piece |     ₱2.00 |
| Moist Cake Container           | Piece |     ₱6.00 |
| Taisan Packaging               | Piece |    ₱13.00 |
| Lengua de Gato/Yema/Moist Cake | Piece |     ₱6.00 |

---

# 6. Packaging Types

Packaging should be categorized for easier management.

Initial packaging types:

* Liner
* Box
* Container
* Clamshell
* Sheet
* Bag
* Wrapper
* Other

The business may add additional packaging types later.

---

# 7. Packaging Master Rules

## 7.1 Create Packaging

A user can create a new packaging item by providing:

* Packaging Code
* Packaging Name
* Packaging Type
* Unit
* Current Unit Cost
* Reorder Level

### Business rules

* Packaging Code must be unique.
* Packaging Name is required.
* Packaging Type is required.
* Unit is required.
* Unit Cost cannot be negative.
* Reorder Level cannot be negative.
* Packaging should initially be Active.

---

## 7.2 Update Packaging

Users can update:

* Packaging name
* Packaging type
* Unit
* Current unit cost
* Reorder level

Historical inventory transactions should not be changed when the current packaging cost is updated.

---

## 7.3 Deactivate Packaging

Packaging should preferably be **deactivated rather than permanently deleted** when it has already been used in recipes or inventory transactions.

Inactive packaging:

* Cannot be added to new recipes.
* Cannot be used for new stock transactions.
* Remains visible in historical records.
* Remains associated with existing recipes where historical information is required.

---

# 8. Recipe Packaging

The existing Recipe screen will receive a new **Packaging** section.

The existing Ingredient section remains unchanged.

### Recipe structure

```text
RECIPE
│
├── Ingredients
│
├── Packaging       ← NEW
│
└── Existing Recipe Information
```

---

# 9. Adding Packaging to a Recipe

A user can add one or more packaging materials to a recipe.

Each recipe packaging entry contains:

* Packaging
* Quantity
* Unit

### Example

For a Banana Muffin recipe producing 12 muffins:

| Packaging                | Quantity | Unit | Unit Cost |       Cost |
| ------------------------ | -------: | ---- | --------: | ---------: |
| Banana Muffin Liner      |       12 | pcs  |     ₱2.00 |     ₱24.00 |
| Banana Muffin Box        |        1 | pc   |    ₱15.00 |     ₱15.00 |
| **Total Packaging Cost** |          |      |           | **₱39.00** |

---

# 10. Packaging Quantity Business Rule

Packaging quantity represents the amount required to produce **one recipe batch**.

For example:

> Banana Muffin recipe = 12 muffins per batch

If the recipe requires:

> 12 liners per batch

then producing 5 batches requires:

> 12 × 5 = 60 liners

Similarly, if one box is required per batch:

> 1 × 5 = 5 boxes

---

# 11. Packaging Cost Calculation

Packaging cost is calculated from:

> **Packaging Cost = Quantity Required × Current Unit Cost**

### Example

Banana Muffin Liner:

> 12 pcs × ₱2.00 = ₱24.00

Banana Muffin Box:

> 1 pc × ₱15.00 = ₱15.00

Total:

> **₱24.00 + ₱15.00 = ₱39.00**

---

# 12. Total Recipe Cost

The existing ingredient costing remains unchanged.

Packaging is simply added as an additional cost component.

### Formula

> **Total Recipe Cost = Existing Ingredient Cost + Total Packaging Cost**

### Example

| Cost Component        |      Amount |
| --------------------- | ----------: |
| Ingredient Cost       |     ₱250.00 |
| Packaging Cost        |      ₱39.00 |
| **Total Recipe Cost** | **₱289.00** |

No separate costing methodology is required for packaging.

---

# 13. Cost Per Product

If the recipe produces multiple products per batch, packaging cost is distributed according to the existing recipe yield logic.

### Example

Recipe:

* Total batch cost = ₱289
* Yield = 12 muffins

Therefore:

> ₱289 ÷ 12 = ₱24.08 per muffin

The packaging portion is already included in this amount.

---

# 14. Packaging Inventory

Packaging inventory should follow the same general business concept as the existing inventory system.

Packaging has two primary inventory movements:

```text
PACKAGING STOCK-IN
       ↓
AVAILABLE PACKAGING
       ↓
PACKAGING USED IN PRODUCTION
       ↓
PACKAGING STOCK-OUT
```

---

# 15. Packaging Stock-In

Stock-In represents packaging received and made available for production.

Example:

> Receive 500 Banana Muffin Liners.

The system records:

* Packaging = Banana Muffin Liner
* Quantity = 500 pcs
* Unit Cost = ₱2.00
* Total Value = ₱1,000.00
* Transaction Date

The available packaging becomes:

> **500 pcs**

---

# 16. Packaging Stock-In Business Rules

When packaging is stocked in:

1. Packaging must exist in the Packaging Master.
2. Packaging must be Active.
3. Quantity must be greater than zero.
4. Unit cost cannot be negative.
5. Stock quantity increases.
6. The transaction is recorded in packaging inventory history.
7. The current packaging cost may be updated according to the existing business rule for current material cost.

---

# 17. Packaging Stock-Out

Packaging Stock-Out occurs when packaging is consumed during production.

Users should **not normally manually enter packaging consumption during production**.

Instead:

> **Production automatically consumes the packaging defined in the recipe.**

This prevents users from having to calculate packaging consumption manually.

---

# 18. Production Packaging Consumption

Example:

### Banana Muffin Recipe

One batch requires:

* 12 Banana Muffin Liners
* 1 Banana Muffin Box

If the user produces:

> **5 batches**

The system calculates:

| Packaging           | Per Batch | Batches | Total Used |
| ------------------- | --------: | ------: | ---------: |
| Banana Muffin Liner |        12 |       5 |         60 |
| Banana Muffin Box   |         1 |       5 |          5 |

The inventory automatically records:

* 60 liners OUT
* 5 boxes OUT

---

# 19. Packaging Stock Validation

Before production is confirmed, the system should verify that enough packaging is available.

### Example

Available:

> 40 Banana Muffin Liners

Production requires:

> 60 Banana Muffin Liners

The system should prevent the production transaction from being completed and display an insufficient-stock message.

### Business rule

> **Production cannot consume more packaging than the available packaging inventory.**

The same validation applies independently to each packaging item.

---

# 20. Packaging Inventory Balance

The available packaging quantity follows:

> **Available Packaging = Total Stock-In − Total Stock-Out**

Example:

```text
Stock-In       500 pcs
Stock-Out       60 pcs
----------------------
Available      440 pcs
```

---

# 21. Packaging Inventory Monitoring

The Inventory area should provide a Packaging view.

### Packaging Inventory

| Packaging           | Unit | Available | Reorder Level | Status  |
| ------------------- | ---- | --------: | ------------: | ------- |
| Banana Muffin Liner | pcs  |       440 |           100 | Normal  |
| Banana Muffin Box   | pcs  |        20 |            30 | Reorder |
| Cupcake Liner       | pcs  |       200 |           100 | Normal  |

---

# 22. Packaging Stock Status

The system should determine the packaging status based on available quantity.

### Normal

> Available Quantity > Reorder Level

### Reorder

> Available Quantity ≤ Reorder Level

This provides a simple operational indication that packaging needs replenishment.

---

# 23. Packaging Transaction History

The system should provide a history of packaging movements.

Example:

| Date   | Packaging           | Transaction | Quantity | Reference                |
| ------ | ------------------- | ----------- | -------: | ------------------------ |
| Sept 1 | Banana Muffin Liner | IN          |      500 | Stock Receipt            |
| Sept 2 | Banana Muffin Liner | OUT         |       60 | Banana Muffin Production |
| Sept 3 | Banana Muffin Liner | OUT         |       36 | Banana Muffin Production |
| Sept 4 | Banana Muffin Liner | IN          |      300 | Stock Receipt            |

This allows users to understand where packaging inventory was consumed.

---

# 24. Packaging Consumption by Recipe

The system should be able to identify which recipe consumed packaging.

Example:

```text
Banana Muffin
    ↓
Banana Muffin Liner
    ↓
60 pcs consumed
```

This allows the business to monitor packaging usage by product.

---

# 25. Packaging Cost and Production

Packaging cost must follow production quantity.

### Example

Recipe:

> Banana Muffin

Packaging requirement:

> 12 liners per batch

Production:

> 10 batches

Packaging consumption:

> 12 × 10 = 120 liners

Packaging cost:

> 120 × ₱2 = ₱240

The production cost therefore includes:

> **₱240 packaging cost**

---

# 26. Packaging and Revenue

The existing revenue calculation remains unchanged.

Packaging becomes part of the total production cost.

### Formula

> **Production Cost = Ingredient Cost + Packaging Cost**

Then:

> **Projected Gross Income = Sales Revenue − Production Cost**

Packaging therefore automatically affects the projected income already calculated by the existing system.

---

# 27. Example — Complete Business Flow

## Step 1 — Create Packaging

Create:

> Banana Muffin Liner
> Unit: Piece
> Cost: ₱2.00

Create:

> Banana Muffin Box
> Unit: Piece
> Cost: ₱15.00

---

## Step 2 — Stock Packaging

Receive:

> 500 Banana Muffin Liners

Receive:

> 50 Banana Muffin Boxes

Inventory:

```text
Banana Muffin Liners = 500 pcs
Banana Muffin Boxes  = 50 pcs
```

---

## Step 3 — Add Packaging to Recipe

Banana Muffin recipe:

> 12 liners per batch

> 1 box per batch

Packaging cost:

```text
12 × ₱2.00 = ₱24.00
1 × ₱15.00 = ₱15.00

Total Packaging Cost = ₱39.00
```

---

## Step 4 — Calculate Recipe Cost

Suppose existing ingredient cost is:

> ₱250.00

Then:

```text
Ingredient Cost     ₱250.00
Packaging Cost       ₱39.00
----------------------------
Total Batch Cost    ₱289.00
```

---

## Step 5 — Produce 5 Batches

Required packaging:

```text
12 liners × 5 = 60 liners

1 box × 5 = 5 boxes
```

Inventory becomes:

```text
500 - 60 = 440 liners

50 - 5 = 45 boxes
```

---

# 28. User Interface Structure

The Packaging functionality should be added to the existing application without redesigning unrelated screens.

### Suggested navigation

```text
Inventory
│
├── Ingredients       ← Existing
├── Packaging         ← NEW
└── Transactions      ← Existing / Extended
```

### Packaging

```text
Packaging
│
├── Packaging List
├── Add Packaging
├── Edit Packaging
└── Packaging Inventory
```

### Recipe

```text
Recipe
│
├── Ingredients       ← Existing
├── Packaging         ← NEW
└── Cost Summary      ← Existing, extended with packaging
```

---

# 29. Packaging List

The Packaging List should provide:

* Search
* Packaging Type filter
* Active/Inactive filter
* Packaging name
* Unit
* Current cost
* Reorder level
* Current stock
* Status

Example:

| Packaging           | Type  | Unit |   Cost | Stock | Status  |
| ------------------- | ----- | ---- | -----: | ----: | ------- |
| Banana Muffin Liner | Liner | pcs  |  ₱2.00 |   440 | Normal  |
| Banana Muffin Box   | Box   | pcs  | ₱15.00 |    45 | Normal  |
| Cupcake Liner       | Liner | pcs  |  ₱1.00 |    80 | Reorder |

---

# 30. Packaging Management Workflow

```text
Create Packaging
       ↓
Set Packaging Type
       ↓
Set Unit
       ↓
Set Current Cost
       ↓
Set Reorder Level
       ↓
Stock-In Packaging
       ↓
Add Packaging to Recipe
       ↓
Packaging Cost Included in Recipe Cost
       ↓
Produce Recipe
       ↓
Packaging Automatically Consumed
       ↓
Packaging Inventory Updated
       ↓
Monitor Remaining Stock
```

---

# 31. Business Rules Summary

|  # | Business Rule                                                                   |
| -: | ------------------------------------------------------------------------------- |
|  1 | Packaging is separate from Ingredients                                          |
|  2 | Packaging has its own master list                                               |
|  3 | Packaging must have a defined unit                                              |
|  4 | Packaging must have a current unit cost                                         |
|  5 | Packaging can be assigned to recipes                                            |
|  6 | Recipe packaging quantity represents one batch                                  |
|  7 | Packaging cost = quantity × unit cost                                           |
|  8 | Total recipe cost includes packaging cost                                       |
|  9 | Packaging stock increases through Stock-In                                      |
| 10 | Packaging stock decreases through production                                    |
| 11 | Packaging consumption is automatically calculated                               |
| 12 | Production validates available packaging stock                                  |
| 13 | Packaging cannot be consumed beyond available stock                             |
| 14 | Packaging stock is monitored separately                                         |
| 15 | Packaging can have a reorder level                                              |
| 16 | Packaging usage can be traced to a recipe                                       |
| 17 | Existing ingredient functionality remains unchanged                             |
| 18 | Existing production workflow remains unchanged except for packaging consumption |
| 19 | Existing costing logic remains unchanged except for adding packaging cost       |
| 20 | Inactive packaging remains available for historical records                     |

---

# 32. Implementation Sequence

The implementation should be performed incrementally.

## Phase 1 — Packaging Master

Implement:

* Packaging list
* Add packaging
* Edit packaging
* Activate/deactivate packaging
* Packaging types
* Validation

**Result:** Business users can maintain packaging materials.

---

## Phase 2 — Recipe Packaging

Add:

* Packaging section to Recipe
* Add packaging
* Edit packaging quantity
* Remove packaging
* Display packaging cost

**Result:** Recipes can define their packaging requirements.

---

## Phase 3 — Recipe Cost Extension

Extend the existing recipe cost calculation to include:

> Ingredient Cost + Packaging Cost

**Result:** Existing recipe costing now reflects packaging expense.

---

## Phase 4 — Packaging Inventory

Add:

* Packaging Stock-In
* Packaging balance
* Packaging transaction history
* Packaging stock monitoring
* Reorder status

**Result:** The business can monitor available packaging.

---

## Phase 5 — Production Integration

Extend the existing production process so that it:

1. Reads the recipe packaging requirements.
2. Calculates required packaging.
3. Checks packaging availability.
4. Prevents production when required packaging is insufficient.
5. Records packaging consumption.
6. Updates packaging inventory.

**Result:** Packaging is automatically consumed when products are produced.

---

## Phase 6 — Monitoring

Provide visibility into:

* Current packaging stock
* Packaging consumed
* Packaging remaining
* Packaging usage by recipe
* Packaging requiring replenishment
* Packaging cost contribution

---

# 33. Final End-to-End Business Model

```text
                 PACKAGING MASTER
                       │
                       ▼
               PACKAGING DEFINITION
                       │
                       ▼
                RECIPE PACKAGING
                       │
                       ▼
              PACKAGING COST
                       │
                       ▼
              TOTAL RECIPE COST
                       │
                       ▼
                  PRODUCTION
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
      INGREDIENT OUT       PACKAGING OUT
        Existing              New
             │                   │
             └─────────┬─────────┘
                       ▼
               PRODUCTION COST
                       │
                       ▼
                REVENUE / INCOME
                       │
                       ▼
                BUSINESS MONITORING
```

---

# 34. Final Acceptance Scenario

The Packaging implementation is considered complete when the following scenario works correctly:

### Packaging

Create:

> Banana Muffin Liner — ₱2/pc

> Banana Muffin Box — ₱15/pc

### Inventory

Stock in:

> 500 liners

> 50 boxes

### Recipe

Banana Muffin:

> 12 liners per batch

> 1 box per batch

### Cost

Packaging cost:

> 12 × ₱2 + 1 × ₱15 = **₱39 per batch**

### Production

Produce:

> 5 batches

System automatically consumes:

> 60 liners

> 5 boxes

### Remaining Inventory

```text
500 − 60 = 440 liners

50 − 5 = 45 boxes
```

### Cost

The existing recipe cost is automatically extended:

```text
Existing Ingredient Cost
          +
Packaging Cost
          =
Total Recipe Cost
```

### Monitoring

The system displays:

* Packaging stock remaining
* Packaging consumed
* Packaging cost
* Packaging usage by recipe
* Reorder status

---

# 35. Final Design Principle

The implementation should remain **incremental**.

> **Do not rebuild the existing costing, recipe, inventory, or production functionality.**

Only introduce the packaging capability and connect it to the existing workflows.

The final business relationship is:

```text
PACKAGING
   ↓
RECIPE
   ↓
PACKAGING COST
   ↓
PRODUCTION
   ↓
PACKAGING CONSUMPTION
   ↓
PACKAGING INVENTORY
   ↓
RECIPE PROFITABILITY
```

This keeps Packaging independent enough to manage properly while allowing it to participate naturally in the existing Recipe Costing, Inventory, and Production processes.
