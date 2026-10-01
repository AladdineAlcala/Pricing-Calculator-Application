# Recipe Pricing Calculator — Final Solution Architecture

## 1. Overview

The Recipe Pricing Calculator uses an **ingredient-centric conversion architecture**.

The core principle is:

> **Purchase Unit → Normalize to Base Unit → Ingredient-Specific Conversion → Normalize Recipe Quantity → Calculate Cost**

The system should use **ingredient-specific conversions as the source of truth** and treat **Yield Factor as a calculated/derived value**.

---

## 2. Overall Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                         PRICING CALCULATOR                        │
└──────────────────────────────────────────────────────────────────┘

                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                         RECIPE MANAGEMENT                         │
│                                                                  │
│  Recipe X              Recipe Y              Recipe Z             │
│  Flour: 1 cup          Flour: 150 g         Flour: 2 tbsp        │
│  Sugar: ¼ cup          Sugar: 50 g          Sugar: 3 tbsp        │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    INGREDIENT CONVERSION ENGINE                   │
│                                                                  │
│  Flour:  1 cup = 125 g                                           │
│  Sugar:  1 cup = 200 g                                           │
│  Butter: 1 cup = 227 g                                           │
│  Salt:   1 tsp = 6 g                                             │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                         BASE UNIT LAYER                           │
│                                                                  │
│                 Weight       Volume       Count                   │
│                   g            ml           pcs                   │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                         COST ENGINE                              │
│                                                                  │
│        Purchase Price ÷ Base Package Quantity                    │
│                                                                  │
│        Recipe Base Quantity × Cost per Base Unit                 │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                         COST RESULTS                             │
│                                                                  │
│  Ingredient Cost → Recipe Cost → Batch Cost → Cost/Serving      │
│                                    ↓                             │
│                         Selling Price / Margin                    │
└──────────────────────────────────────────────────────────────────┘
```

---

# 3. Core Design Principle

The system should **never calculate ingredient cost directly from the recipe's displayed unit**.

Instead:

```text
Recipe Unit
     ↓
Ingredient-Specific Conversion
     ↓
Canonical Base Unit
     ↓
Cost per Base Unit
     ↓
Ingredient Cost
```

### Example: All-Purpose Flour

Purchase:

```text
1 kg = ₱50
```

Base unit:

```text
gram
```

Ingredient-specific conversion:

```text
1 cup flour = 125 g
```

Recipe:

```text
1 cup flour
```

Calculation:

```text
1 cup
× 125 g/cup
= 125 g

₱50 / 1,000 g
= ₱0.05/g

125 g × ₱0.05
= ₱6.25
```

---

# 4. Domain Model

The core domain consists of:

```text
Ingredient
    │
    ├── IngredientConversion
    │
    └── IngredientPurchase
             │
             ▼
        Cost Calculation
             ▲
             │
Recipe ── RecipeIngredient
```

---

# 5. Ingredient Master

Each ingredient must have one **canonical/base unit**.

### Entity

```text
Ingredient
────────────────────
Id
Name
BaseUnitId
CategoryId
IsActive
```

### Examples

| Ingredient        | Base Unit |
| ----------------- | --------- |
| All-Purpose Flour | g         |
| Bread Flour       | g         |
| Sugar             | g         |
| Butter            | g         |
| Salt              | g         |
| Heavy Cream       | ml        |
| Vanilla           | ml        |
| Egg               | pcs       |

---

# 6. Unit System

Create a centralized unit table.

### Entity

```text
Unit
────────────────────
Id
Code
Name
UnitType
```

### Weight Units

```text
g
kg
oz
lb
```

### Volume Units

```text
ml
L
tsp
tbsp
cup
```

### Count Units

```text
pcs
pack
box
bottle
can
```

> Volume-to-weight conversions must **not** be global because different ingredients have different densities.

For example:

```text
1 cup flour ≈ 125 g
1 cup sugar ≈ 200 g
```

---

# 7. Ingredient Conversion

Ingredient-specific conversion is the core of the calculation engine.

### Entity

```text
IngredientConversion
────────────────────────────
Id
IngredientId
FromUnitId
ToUnitId
ConversionFactor
EffectiveDate
Source
IsActive
```

### Example

| Ingredient | From Unit | To Unit | Factor |
| ---------- | --------- | ------- | -----: |
| Flour      | cup       | g       |    125 |
| Flour      | tbsp      | g       |    7.8 |
| Flour      | tsp       | g       |    2.6 |
| Sugar      | cup       | g       |    200 |
| Sugar      | tbsp      | g       |   12.5 |
| Sugar      | tsp       | g       |   4.17 |
| Butter     | cup       | g       |    227 |
| Salt       | tsp       | g       |      6 |

Therefore:

```text
1 cup Flour = 125 g
```

while:

```text
1 cup Sugar = 200 g
```

---

# 8. Purchase / Supplier Layer

Purchasing information must be independent from recipe measurements.

### Entity

```text
IngredientPurchase
────────────────────────────
Id
IngredientId
SupplierId
PackageQuantity
PackageUnitId
PurchasePrice
PurchaseDate
IsActive
```

### Example

```text
Ingredient:
All-Purpose Flour

Package Quantity:
1 kg

Purchase Price:
₱50
```

Normalize the purchase:

```text
1 kg
 ↓
1,000 g
```

Calculate base-unit cost:

```text
₱50 / 1,000 g
= ₱0.05/g
```

---

# 9. Recipe Layer

Recipes must preserve the **original measurement entered by the baker**.

### Recipe

```text
Recipe
────────────────────
Id
Name
Description
BatchYield
YieldUnitId
```

### RecipeIngredient

```text
RecipeIngredient
────────────────────────
Id
RecipeId
IngredientId
Quantity
UnitId
```

### Example — Recipe X

```text
Ingredient: Flour
Quantity: 1
Unit: cup
```

### Example — Recipe Y

```text
Ingredient: Flour
Quantity: 150
Unit: g
```

### Example — Recipe Z

```text
Ingredient: Flour
Quantity: 2
Unit: tbsp
```

All three recipes are valid.

The recipe does **not** need to use the ingredient's base unit.

---

# 10. Cost Calculation Engine

The cost engine follows a standardized calculation pipeline.

## Step 1 — Determine Purchase Cost

```text
Base Unit Cost =
Purchase Price / Package Quantity in Base Unit
```

Example:

```text
₱50 / 1,000 g
= ₱0.05/g
```

---

## Step 2 — Convert Recipe Quantity

If the recipe already uses the base unit:

```text
150 g
```

No conversion is required.

If the recipe uses another unit:

```text
1 cup
```

The system looks up the ingredient-specific conversion:

```text
Flour + cup → g
```

Result:

```text
125 g
```

---

## Step 3 — Calculate Ingredient Cost

```text
Ingredient Cost =
Normalized Recipe Quantity × Base Unit Cost
```

Example:

```text
125 g × ₱0.05
= ₱6.25
```

---

# 11. Complete Calculation Pipeline

```text
                  PURCHASE
                     │
                     ▼
          Package Quantity + Price
                     │
                     ▼
              Normalize Unit
                     │
                     ▼
            Base Unit Cost
                     │
                     │
                     ▼
RECIPE ───────► RECIPE QUANTITY
                     │
                     ▼
          Ingredient Conversion
                     │
                     ▼
           Normalized Quantity
                     │
                     ▼
             Ingredient Cost
                     │
                     ▼
              Recipe Cost
                     │
                     ▼
               Batch Cost
                     │
                     ▼
              Cost / Serving
                     │
                     ▼
        Pricing / Margin Analysis
```

---

# 12. Yield Factor

Yield Factor should be a **calculated value**, not the primary conversion mechanism.

For example:

```text
Package:
1,000 g Flour

Conversion:
1 cup = 125 g
```

Calculate:

```text
1,000 / 125
= 8 cups
```

Therefore:

> 1 kg flour yields approximately 8 cups.

If Recipe X uses 1 cup:

```text
1,000 / 125
= 8 recipe portions
```

If Recipe Y uses 150 g:

```text
1,000 / 150
= 6.67 recipe portions
```

The same package therefore produces different recipe yields depending on the recipe quantity.

---

# 13. Why Yield Factor Should Be Derived

Do not store:

```text
Flour → Yield Factor = 8
```

as a permanent ingredient property.

Instead calculate:

```text
Package Base Quantity
÷
Recipe Base Quantity
=
Recipe Yield
```

Example:

```text
1,000 g package
÷
125 g recipe quantity
=
8 batches
```

Another recipe:

```text
1,000 g package
÷
150 g recipe quantity
=
6.67 batches
```

Yield is therefore **recipe-dependent**.

---

# 14. Example: Ensaymada

## Flour

Purchase:

```text
1 kg
₱50
```

Base unit:

```text
g
```

Conversion:

```text
1 cup = 125 g
```

Recipe:

```text
1 cup flour
```

Calculation:

```text
1 cup × 125 g
= 125 g

₱50 / 1,000 g
= ₱0.05/g

125 g × ₱0.05
= ₱6.25
```

### Result

```text
Ingredient Cost = ₱6.25
```

---

# 15. Example: Sugar

Purchase:

```text
1 kg
₱50
```

Base unit:

```text
g
```

Conversion:

```text
1 cup = 200 g
```

Recipe:

```text
¼ cup sugar
```

Calculation:

```text
0.25 × 200 g
= 50 g

₱50 / 1,000 g
= ₱0.05/g

50 g × ₱0.05
= ₱2.50
```

### Result

```text
Ingredient Cost = ₱2.50
```

---

# 16. Supporting Different Purchase Sizes

The system should support different supplier package sizes.

### Supplier A

```text
1 kg flour
₱50
```

### Supplier B

```text
25 kg flour
₱1,200
```

Normalize Supplier B:

```text
25 kg
↓
25,000 g
```

Calculate:

```text
₱1,200 / 25,000 g
= ₱0.048/g
```

Recipe:

```text
1 cup flour
```

Conversion:

```text
1 cup = 125 g
```

Cost:

```text
125 × ₱0.048
= ₱6.00
```

The recipe doesn't need to know which package was purchased.

---

# 17. Database Design

## Ingredients

```text
Ingredients
────────────────────────
IngredientId
Name
BaseUnitId
CategoryId
IsActive
```

## Units

```text
Units
────────────────────────
UnitId
Code
Name
UnitType
IsActive
```

## IngredientConversions

```text
IngredientConversions
────────────────────────────
IngredientConversionId
IngredientId
FromUnitId
ToUnitId
ConversionFactor
EffectiveDate
Source
IsActive
```

## IngredientPurchases

```text
IngredientPurchases
────────────────────────────
IngredientPurchaseId
IngredientId
SupplierId
PackageQuantity
PackageUnitId
PurchasePrice
PurchaseDate
IsActive
```

## Recipes

```text
Recipes
────────────────────────
RecipeId
Name
Description
BatchYield
YieldUnitId
IsActive
```

## RecipeIngredients

```text
RecipeIngredients
────────────────────────────
RecipeIngredientId
RecipeId
IngredientId
Quantity
UnitId
```

---

# 18. Database Relationships

```text
                       ┌─────────────┐
                       │   Supplier  │
                       └──────┬──────┘
                              │
                              ▼
┌─────────────┐       ┌────────────────────┐
│ Ingredient  │◄──────│ IngredientPurchase │
└──────┬──────┘       └────────────────────┘
       │
       ├────────────────────────┐
       │                        │
       ▼                        ▼
┌────────────────────┐    ┌──────────────┐
│IngredientConversion│    │     Unit     │
└────────────────────┘    └──────────────┘
       ▲
       │
       │
┌──────┴──────────┐
│ RecipeIngredient│
└──────▲──────────┘
       │
       │
┌──────┴──────┐
│   Recipe    │
└─────────────┘
```

---

# 19. Application Architecture

For a .NET Clean Architecture implementation:

```text
┌────────────────────────────────────────────┐
│              Presentation                  │
│                                            │
│ REST API / Web UI                          │
│ Recipe Management                          │
│ Ingredient Management                      │
│ Purchase Management                        │
│ Pricing Calculator                         │
└─────────────────────┬──────────────────────┘
                      │
┌─────────────────────▼──────────────────────┐
│             Application Layer              │
│                                            │
│ RecipeService                              │
│ IngredientService                          │
│ PurchaseService                            │
│ ConversionService                          │
│ PricingCalculationService                  │
│ YieldCalculationService                    │
└─────────────────────┬──────────────────────┘
                      │
┌─────────────────────▼──────────────────────┐
│               Domain Layer                 │
│                                            │
│ Ingredient                                 │
│ Recipe                                     │
│ RecipeIngredient                           │
│ Unit                                       │
│ IngredientConversion                       │
│ IngredientPurchase                         │
│ PricingRules                               │
└─────────────────────┬──────────────────────┘
                      │
┌─────────────────────▼──────────────────────┐
│            Infrastructure Layer            │
│                                            │
│ EF Core                                    │
│ SQL Database                               │
│ Repositories / Data Access                 │
└────────────────────────────────────────────┘
```

---

# 20. Core Business Rules

### Rule 1 — Every ingredient has one canonical base unit

```text
Flour → g
Sugar → g
Cream → ml
Egg → pcs
```

### Rule 2 — Recipe units are independent

```text
Recipe X → Flour → cup
Recipe Y → Flour → g
Recipe Z → Flour → tbsp
```

### Rule 3 — Volume-to-weight conversion is ingredient-specific

```text
Flour → 1 cup = 125 g
Sugar → 1 cup = 200 g
```

### Rule 4 — Purchase cost is normalized to the base unit

```text
Purchase Price ÷ Base Quantity
```

### Rule 5 — Recipe cost is calculated using the base unit

```text
Normalized Recipe Quantity × Base Unit Cost
```

### Rule 6 — Yield Factor is derived

```text
Package Base Quantity ÷ Recipe Base Quantity
```

### Rule 7 — Preserve the original recipe measurement

Store:

```text
Quantity = 1
Unit = cup
```

Do not replace it with:

```text
Quantity = 125
Unit = g
```

The normalized value can be calculated internally while the original recipe measurement remains visible to the user.

---

# 21. Recommended Calculation DTO

A calculation result can expose both the original and normalized values:

```text
RecipeIngredientCostResult
────────────────────────────────
IngredientId
IngredientName

RecipeQuantity
RecipeUnit

NormalizedQuantity
BaseUnit

PackageQuantity
PackageUnit

PurchasePrice
BaseUnitCost

IngredientCost

YieldFactor
```

Example:

```text
Ingredient:
All-Purpose Flour

Recipe Quantity:
1 cup

Normalized Quantity:
125 g

Package:
1 kg

Purchase Price:
₱50

Base Unit Cost:
₱0.05/g

Ingredient Cost:
₱6.25

Yield Factor:
8 cups/package
```

---

# 22. Validation Rules

The application should validate conversions before calculating costs.

### Valid

```text
Flour:
cup → g
```

because the ingredient has a defined conversion.

### Invalid

```text
Flour:
cup → ml
```

unless a specific conversion has been defined.

### Invalid

```text
Sugar:
cup → g
```

if no sugar-specific cup-to-gram conversion exists.

The application should return an actionable validation message:

```text
No conversion is configured for:
Ingredient = Sugar
From Unit = cup
To Unit = g

Please configure an ingredient-specific conversion.
```

---

# 23. Handling Approximate Conversions

Some kitchen measurements are approximate.

For example:

```text
1 cup flour ≈ 125 g
```

Therefore, the conversion table should optionally support metadata:

```text
ConversionFactor
Source
PrecisionType
EffectiveDate
Notes
```

Example:

```text
Ingredient: Flour
From: cup
To: g
Factor: 125
Precision: Approximate
Source: Standard Baking Conversion
```

This allows your system to distinguish between:

```text
Exact
Approximate
User Defined
Supplier Defined
```

---

# 24. Final Business Logic

The final pricing formula is:

```text
PURCHASE
    │
    ▼
Package Quantity
    │
    ▼
Convert Package to Base Unit
    │
    ▼
Base Unit Cost
    │
    │
    ├───────────────┐
    │               │
    ▼               ▼
Recipe Quantity   Recipe Unit
    │               │
    └───────┬───────┘
            ▼
Ingredient-Specific Conversion
            │
            ▼
Normalized Recipe Quantity
            │
            ▼
Normalized Quantity × Base Unit Cost
            │
            ▼
Ingredient Cost
```

Formula:

```text
Base Unit Cost =
Purchase Price ÷ Package Quantity in Base Unit
```

```text
Normalized Recipe Quantity =
Recipe Quantity × Ingredient Conversion Factor
```

```text
Ingredient Cost =
Normalized Recipe Quantity × Base Unit Cost
```

```text
Recipe Cost =
SUM(All Ingredient Costs)
```

```text
Cost Per Batch =
Recipe Cost
```

```text
Cost Per Serving =
Recipe Cost ÷ Number of Servings
```

---

# 25. Yield Calculation

Yield is calculated separately:

```text
Recipe Yield =
Package Quantity in Base Unit
÷
Recipe Quantity in Base Unit
```

Example:

```text
1,000 g flour
÷
125 g per recipe
=
8 recipe portions
```

For a different recipe:

```text
1,000 g flour
÷
150 g per recipe
=
6.67 recipe portions
```

---

# 26. Final Architecture Decision

The recommended architecture is:

```text
┌─────────────────────────────────────────────┐
│             PURCHASE INFORMATION            │
│                                             │
│ Package Qty + Package Unit + Purchase Price│
└──────────────────────┬──────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  BASE UNIT      │
              │                 │
              │ g / ml / pcs    │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ INGREDIENT      │
              │ CONVERSION      │
              │                 │
              │ cup → g         │
              │ tsp → g         │
              │ tbsp → g        │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ RECIPE          │
              │                 │
              │ 1 cup           │
              │ 150 g           │
              │ 2 tbsp          │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ COST ENGINE     │
              │                 │
              │ ₱ / g           │
              │ ₱ / ml          │
              │ ₱ / pcs         │
              └────────┬────────┘
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
       INGREDIENT COST      YIELD FACTOR
             │                   │
             ▼                   ▼
       RECIPE COST          PACKAGE YIELD
             │
             ▼
       BATCH COST
             │
             ▼
      COST PER SERVING
             │
             ▼
      SELLING PRICE
             │
             ▼
       PROFIT / MARGIN
```

## Final Design Principle

**Ingredient-Specific Conversion = Source of Truth**

**Canonical Base Unit = Calculation Standard**

**Recipe Unit = User/Baker Measurement**

**Purchase Unit = Supplier/Inventory Measurement**

**Yield Factor = Derived Calculation**

This architecture allows the same ingredient to be used across unlimited recipes with different units without duplicating ingredient records or introducing inconsistent costs.

For example:

```text
Flour
│
├── Recipe A → 1 cup
├── Recipe B → 150 g
├── Recipe C → 2 tbsp
└── Recipe D → 0.5 kg
```

All four ultimately normalize to:

```text
GRAMS
  ↓
COST PER GRAM
  ↓
INGREDIENT COST
```

while the original recipe measurements remain intact.
