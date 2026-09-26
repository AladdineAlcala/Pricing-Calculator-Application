// Data models / DTOs shared between Rust and frontend via serde_json
use serde::{Deserialize, Serialize};

fn default_package_type() -> String {
    "Package".to_string()
}
fn default_net_quantity() -> f64 {
    1.0
}
fn default_net_unit() -> String {
    "Kilogram".to_string()
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
    pub batch_qty: f64,
    // Joined fields from ingredients
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
    // Computed fields (precision preserved from Rust)
    pub normalized_unit_cost: f64,
    pub line_item_cost: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecipeIngredientInput {
    pub ingredient_id: i64,
    pub batch_qty: f64,
}

/// Full costing result sent to the frontend (floating-point, frontend rounds).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecipeCostResult {
    pub recipe: Recipe,
    pub line_items: Vec<RecipeIngredient>,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSetting {
    pub setting_key: String,
    pub setting_value: String,
}

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
    }
}
