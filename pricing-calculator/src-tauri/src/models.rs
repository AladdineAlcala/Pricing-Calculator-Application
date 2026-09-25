// Data models / DTOs shared between Rust and frontend via serde_json
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Ingredient {
    pub ingredient_id: i64,
    pub name: String,
    pub purchase_unit: String,
    pub purchase_price: f64,
    pub recipe_unit: String,
    pub yield_factor: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IngredientInput {
    pub name: String,
    pub purchase_unit: String,
    pub purchase_price: f64,
    pub recipe_unit: String,
    pub yield_factor: f64,
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
