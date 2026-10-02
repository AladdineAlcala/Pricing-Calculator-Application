// Tauri IPC bridge — typed wrappers around invoke()
import { invoke } from "@tauri-apps/api/core";

// ── Units (v2.0) ─────────────────────────────────────────────────────────────
export interface Unit {
  unit_id: number;
  code: string;
  name: string;
  unit_type: 'weight' | 'volume' | 'count';
  is_base: boolean;
}

// ── Ingredient Purchases (v2.0) ──────────────────────────────────────────────
export interface IngredientPurchase {
  purchase_id: number;
  ingredient_id: number;
  supplier_name?: string | null;
  package_quantity: number;
  package_unit_id: number;
  purchase_price: number;
  purchase_date: string;
  is_active: boolean;
}

export interface IngredientPurchaseInput {
  supplier_name?: string | null;
  package_quantity: number;
  package_unit_id: number;
  purchase_price: number;
}

export interface IngredientConversion {
  conversion_id: number;
  ingredient_id: number;
  recipe_unit: string;
  yield_factor: number;
  from_unit_id?: number | null;
  to_unit_id?: number | null;
  conversion_factor?: number | null;
  source?: string | null;
  effective_date?: string | null;
  is_active?: boolean;
}

export interface IngredientConversionInput {
  conversion_id?: number;
  recipe_unit: string;
  yield_factor: number;
  from_unit_id?: number | null;
  to_unit_id?: number | null;
  conversion_factor?: number | null;
  source?: string | null;
}

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
  current_stock_qty?: number;
  reorder_threshold?: number;
  supplier?: string | null;
  sku?: string | null;
  conversions?: IngredientConversion[];
  base_unit_id?: number | null;
  category?: string | null;
  purchases?: IngredientPurchase[];
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
  current_stock_qty?: number;
  reorder_threshold?: number;
  supplier?: string | null;
  sku?: string | null;
  conversions?: IngredientConversionInput[];
  base_unit_id?: number | null;
  category?: string | null;
  purchases?: IngredientPurchaseInput[];
}

export interface RecipeIngredientCostResult {
  ingredient_id: number;
  ingredient_name: string;
  recipe_quantity: number;
  recipe_unit_code: string;
  normalized_quantity: number;
  base_unit_code: string;
  package_quantity: number;
  package_unit_code: string;
  purchase_price: number;
  base_unit_cost: number;
  ingredient_cost: number;
  yield_factor: number;
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
  conversion_id?: number | null;
  batch_qty: number;
  ingredient_name: string;
  purchase_unit: string;
  purchase_price: number;
  recipe_unit: string;
  yield_factor: number;
  package_type?: string;
  net_quantity?: number;
  net_unit?: string;
  is_orphaned_conversion?: boolean;
  normalized_unit_cost: number;
  line_item_cost: number;
  base_unit_code?: string | null;
  base_unit_cost?: number | null;
  normalized_quantity?: number | null;
}

export interface RecipeCostResult {
  recipe: Recipe;
  line_items: RecipeIngredient[];
  packaging_items?: RecipePackaging[];
  total_ingredient_cost?: number;
  total_packaging_cost?: number;
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

// ── Units (v2.0) ─────────────────────────────────────────────────────────────
export const getUnits = () => invoke<Unit[]>("get_units");

// ── Ingredient Purchases (v2.0) ──────────────────────────────────────────────
export const getIngredientPurchases = (ingredient_id: number) =>
  invoke<IngredientPurchase[]>("get_ingredient_purchases", { ingredientId: ingredient_id });
export const createIngredientPurchase = (ingredient_id: number, input: IngredientPurchaseInput) =>
  invoke<IngredientPurchase>("create_ingredient_purchase", { ingredientId: ingredient_id, input });
export const updateIngredientPurchase = (purchase_id: number, input: IngredientPurchaseInput) =>
  invoke<void>("update_ingredient_purchase", { purchaseId: purchase_id, input });
export const deleteIngredientPurchase = (purchase_id: number) =>
  invoke<void>("delete_ingredient_purchase", { purchaseId: purchase_id });

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
export interface RecipeIngredientInput {
  id?: number;
  ingredient_id: number;
  conversion_id?: number | null;
  batch_qty: number;
}

export const getRecipeIngredients = (recipe_id: number) =>
  invoke<RecipeIngredient[]>("get_recipe_ingredients", { recipeId: recipe_id });
export const upsertRecipeIngredient = (
  recipe_id: number,
  input: RecipeIngredientInput
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

// ── Packaging (v2.1) ─────────────────────────────────────────────────────────
export interface Packaging {
  packaging_id: number;
  packaging_code: string;
  name: string;
  packaging_type: string;
  unit: string;
  current_unit_cost: number;
  current_stock_qty: number;
  reorder_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackagingInput {
  packaging_code: string;
  name: string;
  packaging_type: string;
  unit: string;
  current_unit_cost: number;
  reorder_threshold: number;
  is_active?: boolean;
}

export interface RecipePackaging {
  id: number;
  recipe_id: number;
  packaging_id: number;
  batch_qty: number;
  packaging_code: string;
  packaging_name: string;
  packaging_type: string;
  unit: string;
  current_unit_cost: number;
  line_item_cost: number;
}

export interface RecipePackagingInput {
  id?: number | null;
  recipe_id: number;
  packaging_id: number;
  batch_qty: number;
}

export interface PackagingTransaction {
  transaction_id: number;
  packaging_id: number;
  transaction_type: "IN" | "OUT";
  quantity: number;
  unit_cost: number;
  reference: string;
  created_at: string;
}

export interface ReceivePackagingPayload {
  packaging_id: number;
  added_qty: number;
  new_unit_cost: number;
}

export interface PackagingLedgerItem {
  packaging_id: number;
  packaging_code: string;
  name: string;
  packaging_type: string;
  unit: string;
  current_unit_cost: number;
  current_stock_qty: number;
  reorder_threshold: number;
  total_value: number;
  is_low_stock: boolean;
}

export const getPackagingList = () => invoke<Packaging[]>("get_packaging_list");
export const createPackaging = (input: PackagingInput) =>
  invoke<Packaging>("create_packaging", { input });
export const updatePackaging = (packaging_id: number, input: PackagingInput) =>
  invoke<Packaging>("update_packaging", { packagingId: packaging_id, input });
export const togglePackagingActive = (packaging_id: number, is_active: boolean) =>
  invoke<void>("toggle_packaging_active", { packagingId: packaging_id, isActive: is_active });

export const getRecipePackaging = (recipe_id: number) =>
  invoke<RecipePackaging[]>("get_recipe_packaging", { recipeId: recipe_id });
export const upsertRecipePackaging = (input: RecipePackagingInput) =>
  invoke<RecipePackaging>("upsert_recipe_packaging", { input });
export const removeRecipePackaging = (id: number) =>
  invoke<void>("remove_recipe_packaging", { id });

export const receivePackagingInventory = (payload: ReceivePackagingPayload) =>
  invoke<void>("receive_packaging_inventory", { payload });
export const getPackagingLedger = () =>
  invoke<PackagingLedgerItem[]>("get_packaging_inventory_ledger");
export const getPackagingInventoryLedger = getPackagingLedger;
export const getPackagingTransactions = (packaging_id?: number | null) =>
  invoke<PackagingTransaction[]>("get_packaging_transactions", { packagingId: packaging_id ?? null });

// ── Export / Backup ───────────────────────────────────────────────────────────
export const exportDataCsv = (recipe_id: number) =>
  invoke<string>("export_data_csv", { recipeId: recipe_id });
export const backupDatabase = (backup_path: string) =>
  invoke<string>("backup_database", { backupPath: backup_path });

// ── Perpetual Inventory & LRC Pricing ─────────────────────────────────────────

export interface ReceiveInventoryPayload {
  ingredient_id: number;
  added_qty: number;
  new_invoice_price: number;
}

export interface InventoryLedgerItem {
  ingredient_id: number;
  name: string;
  purchase_unit: string;
  purchase_price: number;
  current_stock_qty: number;
  reorder_threshold: number;
  total_value: number;
  is_low_stock: boolean;
}

export interface StockDeficit {
  ingredient_name: string;
  required_bulk_qty: number;
  current_bulk_qty: number;
  deficit_qty: number;
  unit: string;
  item_type?: string;
}

export interface ProduceBatchPayload {
  recipe_id: number;
  batches: number;
}

export interface ProduceBatchSuccess {
  recipe_id: number;
  recipe_name: string;
  batches_produced: number;
  timestamp: string;
}

export interface ProductionError {
  message: string;
  deficits?: StockDeficit[];
}

export const receiveInventory = (payload: ReceiveInventoryPayload) =>
  invoke<InventoryLedgerItem>("receive_inventory", { payload });

export const getInventoryLedger = () =>
  invoke<InventoryLedgerItem[]>("get_inventory_ledger");

export const produceBatchWithValidation = (payload: ProduceBatchPayload) =>
  invoke<ProduceBatchSuccess>("produce_batch_with_validation", { payload });

