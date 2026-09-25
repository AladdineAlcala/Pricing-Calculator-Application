1. Pricing Logic and Business Rules for the Added Data
The calculation engine must evaluate the following profitability metrics using high-precision floating-point arithmetic. Markup inputs provided by the user must be treated as whole numbers (e.g., 50) and divided by 100 during calculation to resolve as percentages (e.g., 0.50).

Recommended Retail Price per Item: Calculated by multiplying the Cost per Item by 1 plus the Target Markup Percentage divided by 100.

Gross Profit per Item: Calculated by subtracting the Cost per Item from the Recommended Retail Price per Item.

Gross Margin %: Calculated by dividing the Gross Profit per Item by the Recommended Retail Price per Item, then multiplying by 100 to yield a whole-number percentage representation.

Retail Revenue per Batch: Calculated by multiplying the Recommended Retail Price per Item by the total Items Produced per Batch.

2. Actionable Development Update (Sprint Backlog)
To implement these updates in the current sprint, the following technical tasks must be assigned to the respective engineering roles:

Backend Logic Updates (Rust/Tauri)
Engine Struct Expansion: Expand the core engine's request and response data structures to explicitly define fields for gross_profit_item, gross_margin_pct, retail_revenue_batch, and recommended_retail_price_item.

Markup Input Normalization: Update the existing calculation logic to divide the incoming retail_markup_pct and reseller_markup_pct values by 100 before applying them to the cost multipliers, accommodating whole-number UI inputs.

Formula Implementation: Program the four new business formulas into the calculation sequence immediately after the base batch cost is determined. Ensure variables remain unrounded 64-bit floats (f64) throughout the pipeline.

IPC Payload Mapping: Bind the newly calculated metrics to the outgoing JSON payload, ensuring they are successfully transmitted over the Tauri Inter-Process Communication (IPC) bridge without data loss or premature rounding.

Frontend Logic Updates (React/UI)
UI Grid Expansion: Expand the CSS Grid/Flexbox layout of the PricingSummary React component to include three new dedicated rows for Gross Profit / Item, Gross Margin %, and Retail Revenue / Batch.

Input Field Refactoring: Modify the Recipe Builder's markup input fields to accept whole numbers instead of decimals, updating placeholders and validation logic accordingly (e.g., prompting the user to type "50" rather than "0.50").

State Mapping: Bind the newly created UI rows to the gross_profit_item, gross_margin_pct, and retail_revenue_batch variables actively passed in the updated JSON payload from the Tauri backend.

Percentage Formatting: Apply a dedicated number formatter to the Gross Margin % output to append a percentage sign and round the display value to one decimal place (e.g., 33.3%), distinguishing it structurally from the currency fields.

Label Adjustment: Rename the existing "Retail Price / Item" UI label to explicitly read "Recommended Retail Price / Item" to strictly align with the approved business rule definitions.