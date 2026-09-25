Technical Architecture
The application is structured as a local-first desktop executable. The stack separates the presentation layer (where rounding and visual alerts occur) from the backend engine (which maintains floating-point precision and file operations).
•	Frontend (Presentation Layer): React.js or Vue.js. Handles all UI rendering, input forms, and the conditional formatting for the Profit Goal Alert (e.g., rendering a red warning banner if calculated_profit < desired_profit_alert). All monetary values are rounded to two decimal places using half-up rounding strictly at this layer.
•	Backend (Core Engine): Tauri (Rust). Manages the OS-level webview, executes the Unit of Measure (UOM) conversion math using floating-point precision, and handles file system access for data exports.
•	Database (Data Persistence): SQLite. A single .sqlite file stored in the local application data directory (e.g., %APPDATA% on Windows).
•	Backup & Export Automation: A Rust background thread triggers daily to copy the .sqlite file to a secondary local \Backups folder. The manual export utility executes a SQL dump, converting the joined tables into a user-downloadable CSV or JSON file.
•	Deployment Pipeline: The Tauri compilation process can be fully automated using GitHub Actions. The repository pipeline will run quality gates and compile the native Windows .exe installer directly, streamlining release management without requiring cloud server provisioning.
SQLite Database Schema
The relational schema normalizes the data to support dynamic UOM conversions and multiple recipe profiles. All monetary values are stored as REAL (floating-point) to preserve calculation accuracy before frontend rounding.
1. ingredients
Stores the master list of raw materials, bulk costs, and density factors.
Column Name	Data Type	Constraints	Description
ingredient_id	INTEGER	PRIMARY KEY	Unique identifier.
name	TEXT	NOT NULL	e.g., "All Purpose Flour".
purchase_unit	TEXT	NOT NULL	e.g., "Kilogram".
purchase_price	REAL	NOT NULL	Cost per bulk unit (e.g., 50.00).
recipe_unit	TEXT	NOT NULL	e.g., "Cup".
yield_factor	REAL	NOT NULL	Number of recipe units per purchase unit (e.g., 8.00).
2. recipes
Stores the batch production assumptions, overheads, and margin targets for a specific product.
Column Name	Data Type	Constraints	Description
recipe_id	INTEGER	PRIMARY KEY	Unique identifier.
name	TEXT	NOT NULL	e.g., "Banana Bread Muffins".
yield_qty	REAL	NOT NULL	Units produced per batch (e.g., 12.00).
labor_cost	REAL	DEFAULT 0.0	Fixed labor overhead per batch.
electricity_cost	REAL	DEFAULT 0.0	Fixed utility overhead per batch.
other_overhead	REAL	DEFAULT 0.0	Miscellaneous fixed overhead.
target_markup_pct	REAL	NOT NULL	Retail markup as a decimal (e.g., 0.50).
reseller_markup_pct	REAL	NOT NULL	Reseller markup as a decimal (e.g., 0.20).
desired_profit_alert	REAL	NOT NULL	Threshold triggering UI warning (e.g., 50.00).
3. recipe_ingredients
A mapping table that links specific ingredients to a recipe and defines the quantity used per batch.
Column Name	Data Type	Constraints	Description
id	INTEGER	PRIMARY KEY	Unique identifier.
recipe_id	INTEGER	FOREIGN KEY	Links to recipes.recipe_id.
ingredient_id	INTEGER	FOREIGN KEY	Links to ingredients.ingredient_id.
batch_qty	REAL	NOT NULL	Amount of recipe_unit used (e.g., 1.50).
4. app_settings
A key-value store for global application configuration, including backup preferences.
Column Name	Data Type	Constraints	Description
setting_key	TEXT	PRIMARY KEY	e.g., "auto_backup_enabled", "backup_path".
setting_value	TEXT	NOT NULL	e.g., "true", "C:\PricingBackups".
Calculation Data Flow (Backend to Frontend)
When a user opens the "Banana Bread Muffins" recipe, the Tauri backend executes the following:
1.	Join & Normalize: Queries recipe_ingredients joined with ingredients. For each row, it calculates the normalized unit cost (purchase_price / yield_factor) and multiplies it by batch_qty to get the line-item batch cost.
2.	Aggregate: Sums the line items for the Total Variable Cost, then adds the recipes overhead values (labor, electricity).
3.	Return JSON: The backend sends the unrounded floating-point values via IPC (Inter-Process Communication) to the React frontend.
4.	Render & Alert: The React frontend rounds the values to two decimal places for the user. If the calculated Gross Profit falls below desired_profit_alert, the component renders the alert state.
Baseline Unit of Measure (UOM) conversion matrix for standard baking ingredients.
Ingredient	Purchase Unit (Bulk)	Recipe Unit	Volume-to-Weight Rule	Yield Factor
All-Purpose Flour	1 Kilogram (1000g)	Cup	1 cup = 120g	8.33
Granulated Sugar	1 Kilogram (1000g)	Cup	1 cup = 200g	5.00
Brown Sugar (Packed)	1 Kilogram (1000g)	Cup	1 cup = 213g	4.69
Cocoa Powder	1 Kilogram (1000g)	Cup	1 cup = 100g	10.00
Unsalted Butter	1 Kilogram (1000g)	Cup	1 cup = 227g	4.41
Vegetable Oil	1 Liter (1000ml)	Cup	1 cup = 240ml	4.17
Whole Milk	1 Liter (1000ml)	Cup	1 cup = 240ml	4.17
Baking Powder	100g Container	tsp	1 tsp = 5g	20.00
Baking Soda	100g Container	tsp	1 tsp = 5g	20.00
Vanilla Extract	100ml Bottle	tsp	1 tsp = 5ml	20.00
Large Eggs	1 Dozen	pcs	1 dozen = 12 pcs	12.00

