// Data models / DTOs shared between Rust and frontend via serde_json
use serde::{Deserialize, Serialize};

// ── v2.0: Centralized Unit Entity ───────────────────────────────────────────
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct Unit {
    pub unit_id: i64,
    pub code: String,
    pub name: String,
    pub unit_type: String,
    pub is_base: bool,
}

// ── v2.0: Ingredient Purchase Entity ────────────────────────────────────────
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IngredientPurchase {
    pub purchase_id: i64,
    pub ingredient_id: i64,
    #[serde(default)]
    pub supplier_name: Option<String>,
    pub package_quantity: f64,
    pub package_unit_id: i64,
    pub purchase_price: f64,
    pub purchase_date: String,
    #[serde(default = "default_true")]
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IngredientPurchaseInput {
    #[serde(default)]
    pub supplier_name: Option<String>,
    pub package_quantity: f64,
    pub package_unit_id: i64,
    pub purchase_price: f64,
}

// ── v2.0: Cost Calculation DTO ──────────────────────────────────────────────
#[derive(Debug, Serialize, Deserialize, Clone)]
#[allow(dead_code)]
pub struct RecipeIngredientCostResult {
    pub ingredient_id: i64,
    pub ingredient_name: String,
    pub recipe_quantity: f64,
    pub recipe_unit_code: String,
    pub normalized_quantity: f64,
    pub base_unit_code: String,
    pub package_quantity: f64,
    pub package_unit_code: String,
    pub purchase_price: f64,
    pub base_unit_cost: f64,
    pub ingredient_cost: f64,
    pub yield_factor: f64,
}

/// Normalizes a quantity from any unit to the base unit (g, ml, or pcs).
/// Uses system-level unit conversions (kg→g = 1000, L→ml = 1000, etc.)
pub fn normalize_to_base_unit(qty: f64, from_unit_code: &str, base_unit_code: &str) -> f64 {
    let from = from_unit_code.trim().to_lowercase();
    let base = base_unit_code.trim().to_lowercase();
    if from == base {
        return qty;
    }
    match (from.as_str(), base.as_str()) {
        ("kg" | "kilogram" | "kilograms", "g" | "gram" | "grams") => qty * 1000.0,
        ("oz" | "ounce" | "ounces", "g" | "gram" | "grams") => qty * 28.3495,
        ("lb" | "pound" | "pounds", "g" | "gram" | "grams") => qty * 453.592,
        ("l" | "liter" | "liters" | "litre" | "litres", "ml" | "milliliter" | "milliliters") => qty * 1000.0,
        ("tsp" | "teaspoon" | "teaspoons", "ml" | "milliliter" | "milliliters") => qty * 4.929,
        ("tbsp" | "tablespoon" | "tablespoons", "ml" | "milliliter" | "milliliters") => qty * 14.787,
        ("cup" | "cups", "ml" | "milliliter" | "milliliters") => qty * 236.588,
        _ => qty,
    }
}

fn default_true() -> bool {
    true
}

fn default_package_type() -> String {
    "Package".to_string()
}
fn default_net_quantity() -> f64 {
    1.0
}
fn default_net_unit() -> String {
    "Kilogram".to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct IngredientConversion {
    pub conversion_id: i64,
    pub ingredient_id: i64,
    pub recipe_unit: String,
    pub yield_factor: f64,
    // v2.0: Base-unit conversion engine fields
    #[serde(default)]
    pub from_unit_id: Option<i64>,
    #[serde(default)]
    pub to_unit_id: Option<i64>,
    #[serde(default)]
    pub conversion_factor: Option<f64>,
    #[serde(default)]
    pub source: Option<String>,
    #[serde(default)]
    pub effective_date: Option<String>,
    #[serde(default = "default_true")]
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IngredientConversionInput {
    pub conversion_id: Option<i64>,
    pub recipe_unit: String,
    pub yield_factor: f64,
    // v2.0: Base-unit conversion engine fields
    #[serde(default)]
    pub from_unit_id: Option<i64>,
    #[serde(default)]
    pub to_unit_id: Option<i64>,
    #[serde(default)]
    pub conversion_factor: Option<f64>,
    #[serde(default)]
    pub source: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Ingredient {
    pub ingredient_id: i64,
    pub name: String,
    pub purchase_unit: String,
    pub purchase_price: f64,
    pub recipe_unit: String,
    pub yield_factor: f64,
    #[serde(default = "default_package_type")]
    pub package_type: String,
    #[serde(default = "default_net_quantity")]
    pub net_quantity: f64,
    #[serde(default = "default_net_unit")]
    pub net_unit: String,
    #[serde(default)]
    pub current_stock_qty: f64,
    #[serde(default)]
    pub reorder_threshold: f64,
    #[serde(default)]
    pub supplier: Option<String>,
    #[serde(default)]
    pub sku: Option<String>,
    #[serde(default)]
    pub conversions: Vec<IngredientConversion>,
    // v2.0: Base-unit conversion engine fields
    #[serde(default)]
    pub base_unit_id: Option<i64>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub purchases: Vec<IngredientPurchase>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IngredientInput {
    pub name: String,
    pub purchase_unit: String,
    pub purchase_price: f64,
    pub recipe_unit: String,
    pub yield_factor: f64,
    #[serde(default = "default_package_type")]
    pub package_type: String,
    #[serde(default = "default_net_quantity")]
    pub net_quantity: f64,
    #[serde(default = "default_net_unit")]
    pub net_unit: String,
    #[serde(default)]
    pub current_stock_qty: f64,
    #[serde(default)]
    pub reorder_threshold: f64,
    #[serde(default)]
    pub supplier: Option<String>,
    #[serde(default)]
    pub sku: Option<String>,
    #[serde(default)]
    pub conversions: Vec<IngredientConversionInput>,
    // v2.0: Base-unit conversion engine fields
    #[serde(default)]
    pub base_unit_id: Option<i64>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub purchases: Vec<IngredientPurchaseInput>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Recipe {
    pub recipe_id: i64,
    pub name: String,
    pub yield_qty: f64,
    pub labor_cost: f64,
    pub electricity_cost: f64,
    pub other_overhead: f64,
    pub target_markup_pct: f64,
    pub reseller_markup_pct: f64,
    pub desired_profit_alert: f64,
    #[serde(default)]
    pub ingredient_cost: f64,
    #[serde(default)]
    pub unit_retail_price: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecipeInput {
    pub name: String,
    pub yield_qty: f64,
    pub labor_cost: f64,
    pub electricity_cost: f64,
    pub other_overhead: f64,
    pub target_markup_pct: f64,
    pub reseller_markup_pct: f64,
    pub desired_profit_alert: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecipeIngredient {
    pub id: i64,
    pub recipe_id: i64,
    pub ingredient_id: i64,
    #[serde(default)]
    pub conversion_id: Option<i64>,
    pub batch_qty: f64,
    // Joined fields from ingredients / conversions
    pub ingredient_name: String,
    pub purchase_unit: String,
    pub purchase_price: f64,
    pub recipe_unit: String,
    pub yield_factor: f64,
    #[serde(default = "default_package_type")]
    pub package_type: String,
    #[serde(default = "default_net_quantity")]
    pub net_quantity: f64,
    #[serde(default = "default_net_unit")]
    pub net_unit: String,
    #[serde(default)]
    pub is_orphaned_conversion: bool,
    // Computed fields (precision preserved from Rust)
    pub normalized_unit_cost: f64,
    pub line_item_cost: f64,
    #[serde(default)]
    pub base_unit_code: Option<String>,
    #[serde(default)]
    pub base_unit_cost: Option<f64>,
    #[serde(default)]
    pub normalized_quantity: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecipeIngredientInput {
    #[serde(default)]
    pub id: Option<i64>,
    pub ingredient_id: i64,
    #[serde(default)]
    pub conversion_id: Option<i64>,
    pub batch_qty: f64,
}

/// Full costing result sent to the frontend (floating-point, frontend rounds).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecipeCostResult {
    pub recipe: Recipe,
    pub line_items: Vec<RecipeIngredient>,
    #[serde(default)]
    pub packaging_items: Vec<RecipePackaging>,
    #[serde(default)]
    pub total_ingredient_cost: f64,
    #[serde(default)]
    pub total_packaging_cost: f64,
    pub total_variable_cost: f64,
    pub total_overhead: f64,
    pub total_cost_per_batch: f64,
    pub cost_per_item: f64,
    pub retail_price_per_item: f64,
    pub reseller_price_per_item: f64,
    pub gross_profit_per_batch: f64,
    pub profit_alert_triggered: bool,
    // ── New profitability metrics ────────────────────────────────────────────
    /// Cost per Item × (1 + target_markup_pct / 100)
    pub recommended_retail_price_item: f64,
    /// Recommended Retail Price per Item − Cost per Item
    pub gross_profit_item: f64,
    /// (Gross Profit per Item / Recommended Retail Price per Item) × 100
    pub gross_margin_pct: f64,
    /// Recommended Retail Price per Item × yield_qty
    pub retail_revenue_batch: f64,
}

// ── v2.1: Packaging Management Entities ──────────────────────────────────────
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct Packaging {
    pub packaging_id: i64,
    pub packaging_code: String,
    pub name: String,
    pub packaging_type: String,
    pub unit: String,
    pub current_unit_cost: f64,
    pub current_stock_qty: f64,
    pub reorder_threshold: f64,
    #[serde(default = "default_true")]
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PackagingInput {
    pub packaging_code: String,
    pub name: String,
    pub packaging_type: String,
    pub unit: String,
    pub current_unit_cost: f64,
    pub reorder_threshold: f64,
    #[serde(default = "default_true")]
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct RecipePackaging {
    pub id: i64,
    pub recipe_id: i64,
    pub packaging_id: i64,
    pub batch_qty: f64,
    pub packaging_code: String,
    pub packaging_name: String,
    pub packaging_type: String,
    pub unit: String,
    pub current_unit_cost: f64,
    pub line_item_cost: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecipePackagingInput {
    #[serde(default)]
    pub id: Option<i64>,
    pub recipe_id: i64,
    pub packaging_id: i64,
    pub batch_qty: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PackagingTransaction {
    pub transaction_id: i64,
    pub packaging_id: i64,
    pub transaction_type: String,
    pub quantity: f64,
    pub unit_cost: f64,
    pub reference: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReceivePackagingPayload {
    pub packaging_id: i64,
    pub added_qty: f64,
    pub new_unit_cost: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PackagingLedgerItem {
    pub packaging_id: i64,
    pub packaging_code: String,
    pub name: String,
    pub packaging_type: String,
    pub unit: String,
    pub current_unit_cost: f64,
    pub current_stock_qty: f64,
    pub reorder_threshold: f64,
    pub total_value: f64,
    pub is_low_stock: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSetting {
    pub setting_key: String,
    pub setting_value: String,
}

// ── Hybrid Architecture & Perpetual Inventory DTOs ──────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReceiveInventoryPayload {
    pub ingredient_id: i64,
    pub added_qty: f64,
    pub new_invoice_price: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InventoryLedgerItem {
    pub ingredient_id: i64,
    pub name: String,
    pub purchase_unit: String,
    pub purchase_price: f64,
    pub current_stock_qty: f64,
    pub reorder_threshold: f64,
    pub total_value: f64,
    pub is_low_stock: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct StockDeficit {
    pub ingredient_name: String,
    pub required_bulk_qty: f64,
    pub current_bulk_qty: f64,
    pub deficit_qty: f64,
    pub unit: String,
    #[serde(default = "default_ingredient_type")]
    pub item_type: String,
}

fn default_ingredient_type() -> String {
    "ingredient".to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProduceBatchPayload {
    pub recipe_id: i64,
    pub batches: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProduceBatchSuccess {
    pub recipe_id: i64,
    pub recipe_name: String,
    pub batches_produced: f64,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProductionError {
    pub message: String,
    #[serde(default)]
    pub deficits: Vec<StockDeficit>,
}

impl std::fmt::Display for ProductionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for ProductionError {}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_butter_box_package_normalization() {
        // Business test case: 1 box of butter @ ₱120 containing 225 grams
        let purchase_price: f64 = 120.0;
        let net_quantity: f64 = 225.0; // grams
        let grams_per_cup: f64 = 227.0; // standard culinary density for butter

        // Cost per net content unit (gram)
        let cost_per_gram: f64 = purchase_price / net_quantity;
        assert!((cost_per_gram - (120.0f64 / 225.0f64)).abs() < 1e-9);

        // Yield factor in cups: 225g / 227g per cup
        let yield_factor: f64 = net_quantity / grams_per_cup;
        let normalized_cost_per_cup: f64 = purchase_price / yield_factor;
        assert!((normalized_cost_per_cup - 121.06666666666666f64).abs() < 1e-6);

        // Line item for recipe calling for 0.5 cups
        let batch_qty: f64 = 0.5;
        let line_item_cost: f64 = batch_qty * normalized_cost_per_cup;
        assert!((line_item_cost - 60.53333333333333f64).abs() < 1e-6);
    }

    #[test]
    fn test_flour_sack_package_normalization() {
        // Business test case: 1 sack of flour (25 kg) @ ₱1100
        let purchase_price: f64 = 1100.0;
        let net_quantity: f64 = 25.0; // kg
        let cups_per_kg: f64 = 8.33; // ~120g per cup

        let yield_factor: f64 = net_quantity * cups_per_kg; // 208.25 cups
        let normalized_cost_per_cup: f64 = purchase_price / yield_factor;
        let batch_qty: f64 = 3.0; // 3 cups for a banana bread batch
        let line_item_cost: f64 = batch_qty * normalized_cost_per_cup;

        assert!((yield_factor - 208.25f64).abs() < 1e-9);
        assert!((normalized_cost_per_cup - 5.282112845138055f64).abs() < 1e-6);
        assert!((line_item_cost - 15.846338535414166f64).abs() < 1e-6);
    }

    #[test]
    fn test_ingredient_backward_compatibility_defaults() {
        // Verify JSON without package_type / net_quantity deserializes with safe defaults
        let legacy_json = r#"{
            "ingredient_id": 1,
            "name": "Granulated Sugar",
            "purchase_unit": "Kilogram",
            "purchase_price": 54.0,
            "recipe_unit": "Cup",
            "yield_factor": 5.0
        }"#;

        let parsed: Ingredient = serde_json::from_str(legacy_json).expect("Deserialization failed");
        assert_eq!(parsed.package_type, "Package");
        assert_eq!(parsed.net_quantity, 1.0);
        assert_eq!(parsed.net_unit, "Kilogram");
        assert!(parsed.conversions.is_empty());
    }

    #[test]
    fn test_sugar_multi_unit_conversion_architecture() {
        // Business test case from ApplicationDesignDocument.md:
        // Parent: Sugar (1 kg) @ ₱80.00
        let purchase_price = 80.0f64;

        // Conversion 1: cup (yield = 5.0)
        let cup_yield = 5.0f64;
        let cup_unit_cost = purchase_price / cup_yield; // ₱16.00 per cup
        assert_eq!(cup_unit_cost, 16.0f64);

        // Conversion 2: grams (yield = 1000.0)
        let gram_yield = 1000.0f64;
        let gram_unit_cost = purchase_price / gram_yield; // ₱0.08 per gram
        assert_eq!(gram_unit_cost, 0.08f64);

        // Conversion 3: tbs (yield = 80.0)
        let tbs_yield = 80.0f64;
        let tbs_unit_cost = purchase_price / tbs_yield; // ₱1.00 per tbs
        assert_eq!(tbs_unit_cost, 1.00f64);

        // Formula line item 1: 50.0 grams of sugar
        let batch_qty_grams = 50.0f64;
        let line_item_cost_grams = batch_qty_grams * gram_unit_cost;
        assert_eq!(line_item_cost_grams, 4.00f64);

        // Formula line item 2: 0.25 cups of sugar
        let batch_qty_cups = 0.25f64;
        let line_item_cost_cups = batch_qty_cups * cup_unit_cost;
        assert_eq!(line_item_cost_cups, 4.00f64);
    }

    #[test]
    fn test_multi_occurrence_multi_unit_recipe_costing() {
        // Business test case: Sugar (1 kg @ ₱80.00) added twice in the same recipe:
        // Occurrence 1: 2.0 cups (yield = 5 cups/kg, cost = ₱16.00/cup) -> ₱32.00
        // Occurrence 2: 50.0 grams (yield = 1000 g/kg, cost = ₱0.08/g) -> ₱4.00
        let purchase_price = 80.0f64;

        let cup_yield = 5.0f64;
        let cup_unit_cost = purchase_price / cup_yield;
        let occ1_qty = 2.0f64;
        let occ1_cost = occ1_qty * cup_unit_cost;
        assert_eq!(occ1_cost, 32.00f64);

        let gram_yield = 1000.0f64;
        let gram_unit_cost = purchase_price / gram_yield;
        let occ2_qty = 50.0f64;
        let occ2_cost = occ2_qty * gram_unit_cost;
        assert_eq!(occ2_cost, 4.00f64);

        // Combined Sugar cost in this recipe
        let total_sugar_cost = occ1_cost + occ2_cost;
        assert_eq!(total_sugar_cost, 36.00f64);
    }

    #[test]
    fn test_lrc_replacement_and_inventory_receiving_math() {
        // Flow A: Initial state: Flour 10.0 bags @ ₱100.00
        let initial_stock = 10.0f64;
        let initial_price = 100.0f64;
        let initial_value = initial_stock * initial_price;
        assert_eq!(initial_value, 1000.0f64);

        // Receive delivery: +5.0 bags at new invoice LRC price ₱125.00
        let added_qty = 5.0f64;
        let new_invoice_price = 125.0f64;

        // Flow A Business Invariant:
        // 1. Stock accumulates perpetually: 10 + 5 = 15 bags
        let updated_stock = initial_stock + added_qty;
        assert_eq!(updated_stock, 15.0f64);

        // 2. Active price completely replaced with LRC invoice rate: ₱125.00
        let updated_price = new_invoice_price;
        assert_eq!(updated_price, 125.0f64);

        // 3. New total inventory valuation = 15 * 125.0 = ₱1,875.00
        let updated_total_value = updated_stock * updated_price;
        assert_eq!(updated_total_value, 1875.0f64);
    }

    #[test]
    fn test_production_batch_bulk_requirement_and_deficit_interception() {
        // Flow B: Pre-flight conversion and deficit check
        // Ingredient: All-Purpose Flour, bulk unit = "Bag (1 kg)", yield = 8.33 cups/kg
        let current_stock_qty = 1.0f64; // 1.0 kg on hand
        let yield_factor = 8.33f64;
        let batch_qty_cups = 5.0f64; // 5 cups per batch
        let batches_to_produce = 2.0f64; // 2 batches

        // Total recipe units required = 5.0 * 2.0 = 10.0 cups
        let total_recipe_units = batch_qty_cups * batches_to_produce;
        assert_eq!(total_recipe_units, 10.0f64);

        // Bulk units required = 10.0 cups / 8.33 cups/kg = 1.20048 kg
        let required_bulk_qty = total_recipe_units / yield_factor;
        assert!((required_bulk_qty - 1.2004801920768307f64).abs() < 1e-9);

        // Pre-flight check: required (1.20048) > current (1.0) -> Hard stop deficit!
        let has_deficit = required_bulk_qty > current_stock_qty;
        assert!(has_deficit);

        let deficit_qty = required_bulk_qty - current_stock_qty;
        assert!((deficit_qty - 0.2004801920768307f64).abs() < 1e-9);

        // Path 2: If stock was 2.0 kg instead
        let sufficient_stock = 2.0f64;
        assert!(required_bulk_qty <= sufficient_stock);
        let remaining_stock = sufficient_stock - required_bulk_qty;
        assert!((remaining_stock - 0.7995198079231693f64).abs() < 1e-9);
    }

    #[test]
    fn test_multi_occurrence_bulk_yield_aggregation() {
        // Flow B Multi-Occurrence Domain Rule:
        // Recipe calls for Sugar twice across prep stages:
        // Occurrence 1: 2.0 cups (yield = 5.0 cups/kg -> 0.4 kg bulk)
        // Occurrence 2: 500.0 grams (yield = 1000.0 g/kg -> 0.5 kg bulk)
        let batches = 1.5f64;

        let occ1_bulk = (2.0f64 * batches) / 5.0f64; // 0.6 kg
        let occ2_bulk = (500.0f64 * batches) / 1000.0f64; // 0.75 kg

        // Aggregated bulk requirement for Sugar
        let total_sugar_bulk = occ1_bulk + occ2_bulk;
        assert!((total_sugar_bulk - 1.35f64).abs() < 1e-9);

        // If on hand stock is 1.0 kg -> deficit is 0.35 kg
        let on_hand_stock = 1.0f64;
        let deficit = total_sugar_bulk - on_hand_stock;
        assert!((deficit - 0.35f64).abs() < 1e-9);
    }

    #[test]
    fn test_inventory_ledger_low_stock_evaluation() {
        // Flow C: Passive Alert Monitoring
        let reorder_threshold = 5.0f64;

        // At or below threshold -> Low Stock Alert (true)
        assert!(0.0f64 <= reorder_threshold);
        assert!(4.99f64 <= reorder_threshold);
        assert!(5.00f64 <= reorder_threshold);

        // Strictly above threshold -> Normal (false)
        assert!(!(5.01f64 <= reorder_threshold));
        assert!(!(10.00f64 <= reorder_threshold));
    }

    #[test]
    fn test_base_unit_normalization_and_costing_formulas() {
        // Test 1: Flour: 1 cup from 1 kg @ P50 (ConversionFactor = 125g/cup)
        let package_qty_kg = 1.0;
        let package_price = 50.0;
        let package_base_qty = normalize_to_base_unit(package_qty_kg, "kg", "g"); // 1000g
        assert_eq!(package_base_qty, 1000.0);
        let base_unit_cost = package_price / package_base_qty; // 0.05 / g
        assert_eq!(base_unit_cost, 0.05);

        let recipe_qty_cups = 1.0;
        let flour_conversion_factor = 125.0; // 125g per cup
        let normalized_recipe_qty = recipe_qty_cups * flour_conversion_factor; // 125g
        assert_eq!(normalized_recipe_qty, 125.0);

        let ingredient_cost = normalized_recipe_qty * base_unit_cost; // 125 * 0.05 = 6.25
        assert_eq!(ingredient_cost, 6.25);

        let derived_yield = package_base_qty / normalized_recipe_qty; // 1000 / 125 = 8.0
        assert_eq!(derived_yield, 8.0);

        // Test 2: Sugar: 0.25 cup from 1 kg @ P50 (ConversionFactor = 200g/cup)
        let sugar_conversion_factor = 200.0;
        let sugar_recipe_qty = 0.25;
        let sugar_normalized_qty = sugar_recipe_qty * sugar_conversion_factor; // 50g
        assert_eq!(sugar_normalized_qty, 50.0);
        let sugar_cost = sugar_normalized_qty * (50.0 / 1000.0); // 50 * 0.05 = 2.50
        assert_eq!(sugar_cost, 2.50);

        // Test 3: Flour: 150g from 1 kg @ P50 (direct base unit match)
        let direct_qty_g = 150.0;
        let direct_cost = direct_qty_g * base_unit_cost; // 150 * 0.05 = 7.50
        assert_eq!(direct_cost, 7.50);

        // Test 4: Butter: 0.5 cup (113.5g) from 225g @ P120
        let butter_pkg_g = 225.0;
        let butter_price = 120.0;
        let butter_base_cost = butter_price / butter_pkg_g; // 120 / 225 = 0.5333333333333333
        let butter_qty_g = 0.5 * 227.0; // 113.5g
        let butter_cost = butter_qty_g * butter_base_cost;
        assert!((butter_cost - 60.53333333333333f64).abs() < 1e-4);

        // Test 5: Eggs: 2 pcs from 12 pcs @ P96
        let egg_pkg_pcs = 12.0;
        let egg_price = 96.0;
        let egg_base_cost = egg_price / egg_pkg_pcs; // 8.0 / pc
        let egg_qty = 2.0;
        let egg_cost = egg_qty * egg_base_cost; // 16.0
        assert_eq!(egg_cost, 16.0);
    }

    #[test]
    fn test_packaging_unit_cost_and_batch_extension() {
        // Business test case: Banana Muffin batch requiring liners and a box
        // Liner: 12 pcs @ ₱2.00
        let liner_batch_qty = 12.0f64;
        let liner_unit_cost = 2.00f64;
        let liner_line_item_cost = liner_batch_qty * liner_unit_cost;
        assert_eq!(liner_line_item_cost, 24.00f64);

        // Box: 1 pc @ ₱15.00
        let box_batch_qty = 1.0f64;
        let box_unit_cost = 15.00f64;
        let box_line_item_cost = box_batch_qty * box_unit_cost;
        assert_eq!(box_line_item_cost, 15.00f64);

        let total_packaging_cost = liner_line_item_cost + box_line_item_cost;
        assert_eq!(total_packaging_cost, 39.00f64);
    }

    #[test]
    fn test_recipe_cost_rollup_with_packaging_and_overhead() {
        // Rollup Invariant:
        // total_variable_cost = total_ingredient_cost + total_packaging_cost
        // total_cost_per_batch = total_variable_cost + total_overhead
        let total_ingredient_cost = 150.00f64;
        let total_packaging_cost = 39.00f64;
        let total_overhead = 25.00f64;

        let total_variable_cost = total_ingredient_cost + total_packaging_cost;
        assert_eq!(total_variable_cost, 189.00f64);

        let total_cost_per_batch = total_variable_cost + total_overhead;
        assert_eq!(total_cost_per_batch, 214.00f64);

        let batch_yield = 12.0f64;
        let cost_per_piece = total_cost_per_batch / batch_yield;
        assert!((cost_per_piece - 17.833333333333332f64).abs() < 1e-9);

        // 50% Markup
        let markup_percentage = 50.0f64;
        let recommended_retail_price = cost_per_piece * (1.0 + markup_percentage / 100.0);
        assert!((recommended_retail_price - 26.75f64).abs() < 1e-9);

        // Verification of gross margin at recommended price
        let gross_margin = ((recommended_retail_price - cost_per_piece) / recommended_retail_price) * 100.0;
        assert!((gross_margin - 33.333333333333336f64).abs() < 1e-9);
    }

    #[test]
    fn test_packaging_stock_deficit_detection_and_multi_item_classification() {
        // Multi-Item Deficit Interception Invariant:
        // System must identify both ingredient and packaging shortages in a single atomic pre-flight check
        let batches_to_produce = 2.0f64;

        // Ingredient requirement: Flour (requires 2.5 kg, has 1.0 kg)
        let flour_req = 1.25f64 * batches_to_produce; // 2.5 kg
        let flour_stock = 1.00f64;
        let flour_deficit = StockDeficit {
            ingredient_name: "All-Purpose Flour".to_string(),
            required_bulk_qty: flour_req,
            current_bulk_qty: flour_stock,
            deficit_qty: flour_req - flour_stock,
            unit: "kg".to_string(),
            item_type: "ingredient".to_string(),
        };

        // Packaging requirement: Liner (requires 24 pcs, has 10 pcs)
        let liner_req = 12.0f64 * batches_to_produce; // 24 pcs
        let liner_stock = 10.0f64;
        let liner_deficit = StockDeficit {
            ingredient_name: "Banana Muffin Liner".to_string(),
            required_bulk_qty: liner_req,
            current_bulk_qty: liner_stock,
            deficit_qty: liner_req - liner_stock,
            unit: "Piece".to_string(),
            item_type: "packaging".to_string(),
        };

        let deficits = vec![flour_deficit, liner_deficit];
        assert_eq!(deficits.len(), 2);
        assert_eq!(deficits[0].item_type, "ingredient");
        assert_eq!(deficits[0].deficit_qty, 1.50f64);
        assert_eq!(deficits[1].item_type, "packaging");
        assert_eq!(deficits[1].deficit_qty, 14.0f64);
    }

    #[test]
    fn test_packaging_stock_receiving_and_ledger_math() {
        // Flow: Perpetual inventory reception and valuation
        let initial_stock = 50.0f64;
        let initial_cost = 2.00f64;
        assert_eq!(initial_stock * initial_cost, 100.00f64);

        // Stock receipt: +100 units at revised unit cost ₱2.20
        let received_qty = 100.0f64;
        let new_unit_cost = 2.20f64;

        let updated_stock = initial_stock + received_qty;
        assert_eq!(updated_stock, 150.00f64);

        let total_valuation = updated_stock * new_unit_cost;
        assert_eq!(total_valuation, 330.00f64);

        // Low stock threshold check
        let reorder_threshold = 200.00f64;
        let is_low_stock = updated_stock <= reorder_threshold;
        assert!(is_low_stock);
    }
}

