Application Design Document: Multi-Unit Architecture Update
This addendum permanently updates the core Application Design Document (ADD) to replace the static one-to-one ingredient measurement model with a dynamic, multi-unit hierarchical architecture. This allows a single bulk ingredient purchase to be mapped to infinite recipe unit variations.

1. Updated Data Model Design (SQLite)
The relational schema is expanded into a normalized three-table structure to decouple bulk financial costs from recipe-specific measurement units.

Table: ingredients (Parent Entity)
Stores the financial cost and bulk metrics of the physical item.

Column	Data Type	Constraints	Description
ingredient_id	INTEGER	PRIMARY KEY	Unique identifier.
name	TEXT	NOT NULL	
Item name (e.g., Sugar). 
PNG

purchase_unit	TEXT	NOT NULL	
Bulk metric (e.g., 1 kg). 
PNG

purchase_price	REAL	NOT NULL	
Financial cost of the bulk unit (e.g., 80.00). 
PNG

Table: ingredient_conversions (Child Entity)
Stores the multiple yield variations for a single bulk ingredient.

Column	Data Type	Constraints	Description
conversion_id	INTEGER	PRIMARY KEY	Unique identifier.
ingredient_id	INTEGER	FOREIGN KEY	Links to ingredients. ON DELETE CASCADE.
recipe_unit	TEXT	NOT NULL	
Kitchen metric (e.g., cup, grams, tbs). 
PNG

yield_factor	REAL	NOT NULL	
Units derived from the bulk purchase (e.g., 5, 1000, 80). 
PNG

Table: recipe_items (Transactional Entity)
Stores the specific formulation for a recipe batch.

Column	Data Type	Constraints	Description
item_id	INTEGER	PRIMARY KEY	Unique identifier.
recipe_id	INTEGER	FOREIGN KEY	Links to recipes.
ingredient_id	INTEGER	FOREIGN KEY	Links to ingredients.
conversion_id	INTEGER	FOREIGN KEY	Links to ingredient_conversions to lock the selected unit.
batch_qty	REAL	NOT NULL	
Quantity used in the formula (e.g., 50.0). 
PNG

2. UI/UX Interaction Specifications
The frontend interface requires structural modifications to handle nested data arrays and prevent invalid unit selections during recipe formulation.

Ingredient Master (Master-Detail View):

The primary form captures the bulk name, purchase_unit, and purchase_price.

An inline, editable sub-grid is appended beneath the primary form, allowing users to dynamically add, edit, or delete multiple recipe_unit and yield_factor combinations for that specific ingredient.

Recipe Builder (Cascading Selectors):

Primary Dropdown (Ingredient): The user selects the parent item (e.g., "Sugar").

Secondary Dropdown (Unit): This field remains disabled until an ingredient is selected. Once active, it dynamically filters to display only the units defined in the ingredient_conversions table for that parent item (e.g., strictly limiting the user to "cup", "grams", or "tbs").   
PNG

Constraint: If a user deletes a conversion rule from the Ingredient Master that is currently actively used in a saved recipe, the UI must flag the orphaned recipe item with a warning state (e.g., "⚠️ Unit configuration missing. Please reselect.") rather than crashing the calculation engine.

3. Calculation Engine Logic Updates
The Rust backend must resolve the exact micro-cost of a line item by fetching the specific yield factor tied to the user's selected conversion_id.

Calculation Sequence:

Retrieve Line Item Constraints: Fetch purchase_price from ingredients and yield_factor from ingredient_conversions.

Determine Normalized Unit Cost: Divide purchase_price by the yield_factor (e.g., 80.00 ÷ 1000 = 0.08 per gram).   
PNG

Calculate Batch Line Cost: Multiply the Normalized Unit Cost by the batch_qty (e.g., 0.08 × 50 = 4.00).   
PNG

Aggregate: Sum all Batch Line Costs to formulate the total_variable_cost, which is then passed downstream to calculate the retail margins, revenue, and profit alerts.

4. IPC Data Contract (Tauri to React)
To ensure zero latency when a user is formulating a recipe, the backend will transmit a nested JSON structure during application load. This allows the React frontend to manage the cascading dropdowns purely in memory without executing a new SQLite query every time an ingredient is selected.

Initialization Payload Structure:

JSON
[
  {
    "ingredient_id": 1,
    "name": "Sugar",
    "purchase_unit": "1 kg",
    "purchase_price": 80.00,
    "conversions": [
      { "conversion_id": 1, "recipe_unit": "cup", "yield_factor": 5.0 },
      { "conversion_id": 2, "recipe_unit": "grams", "yield_factor": 1000.0 },
      { "conversion_id": 3, "recipe_unit": "tbs", "yield_factor": 80.0 }
    ]
  }
]