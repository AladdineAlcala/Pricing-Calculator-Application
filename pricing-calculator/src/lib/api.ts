// Tauri IPC bridge — typed wrappers around invoke()
import { invoke } from "@tauri-apps/api/core";

export interface Ingredient {
  ingredient_id: number;
  name: string;
  purchase_unit: string;
  purchase_price: number;
  recipe_unit: string;
  yield_factor: number;
  package_type?: string;
  net_quantity?: number;
  net_unit?: string;
}

export interface IngredientInput {
  name: string;
  purchase_unit: string;
  purchase_price: number;
  recipe_unit: string;
  yield_factor: number;
  package_type: string;
  net_quantity: number;
  net_unit: string;
}

export interface Recipe {
  recipe_id: number;
  name: string;
  yield_qty: number;
  labor_cost: number;
  electricity_cost: number;
  other_overhead: number;
  target_markup_pct: number;
  reseller_markup_pct: number;
  desired_profit_alert: number;
  ingredient_cost: number;
  unit_retail_price: number;
}

export interface RecipeInput {
  name: string;
  yield_qty: number;
  labor_cost: number;
  electricity_cost: number;
  other_overhead: number;
  target_markup_pct: number;
  reseller_markup_pct: number;
  desired_profit_alert: number;
}

export interface RecipeIngredient {
  id: number;
  recipe_id: number;
  ingredient_id: number;
  batch_qty: number;
  ingredient_name: string;
  purchase_unit: string;
  purchase_price: number;
  recipe_unit: string;
  yield_factor: number;
  package_type?: string;
  net_quantity?: number;
  net_unit?: string;
  normalized_unit_cost: number;
  line_item_cost: number;
}

export interface RecipeCostResult {
  recipe: Recipe;
  line_items: RecipeIngredient[];
  total_variable_cost: number;
  total_overhead: number;
  total_cost_per_batch: number;
  cost_per_item: number;
  retail_price_per_item: number;
  reseller_price_per_item: number;
  gross_profit_per_batch: number;
  profit_alert_triggered: boolean;
  // ── New profitability metrics ──────────────────────────────────────────
  recommended_retail_price_item: number;
  gross_profit_item: number;
  gross_margin_pct: number;
  retail_revenue_batch: number;
}

export interface AppSetting {
  setting_key: string;
  setting_value: string;
}

// ── Ingredients ──────────────────────────────────────────────────────────────
export const getIngredients = () => invoke<Ingredient[]>("get_ingredients");
export const createIngredient = (input: IngredientInput) =>
  invoke<Ingredient>("create_ingredient", { input });
export const updateIngredient = (ingredient_id: number, input: IngredientInput) =>
  invoke<void>("update_ingredient", { ingredientId: ingredient_id, input });
export const deleteIngredient = (ingredient_id: number) =>
  invoke<void>("delete_ingredient", { ingredientId: ingredient_id });

// ── Recipes ──────────────────────────────────────────────────────────────────
export const getRecipes = () => invoke<Recipe[]>("get_recipes");
export const createRecipe = (input: RecipeInput) =>
  invoke<Recipe>("create_recipe", { input });
export const updateRecipe = (recipe_id: number, input: RecipeInput) =>
  invoke<void>("update_recipe", { recipeId: recipe_id, input });
export const deleteRecipe = (recipe_id: number) =>
  invoke<void>("delete_recipe", { recipeId: recipe_id });

// ── Recipe Ingredients ────────────────────────────────────────────────────────
export const getRecipeIngredients = (recipe_id: number) =>
  invoke<RecipeIngredient[]>("get_recipe_ingredients", { recipeId: recipe_id });
export const upsertRecipeIngredient = (
  recipe_id: number,
  input: { ingredient_id: number; batch_qty: number }
) => invoke<void>("upsert_recipe_ingredient", { recipeId: recipe_id, input });
export const removeRecipeIngredient = (id: number) =>
  invoke<void>("remove_recipe_ingredient", { id });

// ── Costing Engine ────────────────────────────────────────────────────────────
export const calculateRecipeCost = (recipe_id: number) =>
  invoke<RecipeCostResult>("calculate_recipe_cost", { recipeId: recipe_id });

// ── Settings ──────────────────────────────────────────────────────────────────
export const getSettings = () => invoke<AppSetting[]>("get_settings");
export const setSetting = (key: string, value: string) =>
  invoke<void>("set_setting", { key, value });

// ── Export / Backup ───────────────────────────────────────────────────────────
export const exportDataCsv = (recipe_id: number) =>
  invoke<string>("export_data_csv", { recipeId: recipe_id });
export const backupDatabase = (backup_path: string) =>
  invoke<string>("backup_database", { backupPath: backup_path });
