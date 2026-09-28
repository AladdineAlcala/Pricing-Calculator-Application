// Tauri IPC command handlers — ingredients CRUD + recipe costing engine
use crate::db::get_db_path;
use crate::models::*;
use rusqlite::{params, Connection};
use std::sync::Mutex;
use tauri::State;

pub struct DbState(pub Mutex<Connection>);

// ── Ingredients ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_ingredients(state: State<DbState>) -> Result<Vec<Ingredient>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Load conversions map
    let mut conv_map: std::collections::HashMap<i64, Vec<IngredientConversion>> =
        std::collections::HashMap::new();
    let mut conv_stmt = conn
        .prepare(
            "SELECT conversion_id, ingredient_id, recipe_unit, yield_factor
             FROM ingredient_conversions ORDER BY conversion_id ASC",
        )
        .map_err(|e| e.to_string())?;

    let conv_rows = conv_stmt
        .query_map([], |row| {
            Ok(IngredientConversion {
                conversion_id: row.get(0)?,
                ingredient_id: row.get(1)?,
                recipe_unit: row.get(2)?,
                yield_factor: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    for c in conv_rows {
        if let Ok(conv) = c {
            conv_map.entry(conv.ingredient_id).or_default().push(conv);
        }
    }

    let mut stmt = conn
        .prepare(
            "SELECT ingredient_id, name, purchase_unit, purchase_price, recipe_unit, yield_factor,
                    COALESCE(package_type, 'Package'), COALESCE(net_quantity, 1.0), COALESCE(net_unit, 'Kilogram')
             FROM ingredients ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map([], |row| {
            let ingredient_id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let purchase_unit: String = row.get(2)?;
            let purchase_price: f64 = row.get(3)?;
            let recipe_unit: String = row.get(4)?;
            let yield_factor: f64 = row.get(5)?;
            let package_type: String = row.get(6)?;
            let net_quantity: f64 = row.get(7)?;
            let net_unit: String = row.get(8)?;

            let conversions = conv_map.remove(&ingredient_id).unwrap_or_else(|| {
                vec![IngredientConversion {
                    conversion_id: 0,
                    ingredient_id,
                    recipe_unit: recipe_unit.clone(),
                    yield_factor,
                }]
            });

            Ok(Ingredient {
                ingredient_id,
                name,
                purchase_unit,
                purchase_price,
                recipe_unit,
                yield_factor,
                package_type,
                net_quantity,
                net_unit,
                conversions,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub fn create_ingredient(
    state: State<DbState>,
    input: IngredientInput,
) -> Result<Ingredient, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO ingredients (name, purchase_unit, purchase_price, recipe_unit, yield_factor, package_type, net_quantity, net_unit)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            input.name,
            input.purchase_unit,
            input.purchase_price,
            input.recipe_unit,
            input.yield_factor,
            input.package_type,
            input.net_quantity,
            input.net_unit
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let mut created_conversions = Vec::new();

    if !input.conversions.is_empty() {
        for conv in &input.conversions {
            conn.execute(
                "INSERT INTO ingredient_conversions (ingredient_id, recipe_unit, yield_factor) VALUES (?1, ?2, ?3)",
                params![id, conv.recipe_unit, conv.yield_factor],
            )
            .map_err(|e| e.to_string())?;
            let cid = conn.last_insert_rowid();
            created_conversions.push(IngredientConversion {
                conversion_id: cid,
                ingredient_id: id,
                recipe_unit: conv.recipe_unit.clone(),
                yield_factor: conv.yield_factor,
            });
        }
    } else {
        conn.execute(
            "INSERT INTO ingredient_conversions (ingredient_id, recipe_unit, yield_factor) VALUES (?1, ?2, ?3)",
            params![id, input.recipe_unit, input.yield_factor],
        )
        .map_err(|e| e.to_string())?;
        let cid = conn.last_insert_rowid();
        created_conversions.push(IngredientConversion {
            conversion_id: cid,
            ingredient_id: id,
            recipe_unit: input.recipe_unit.clone(),
            yield_factor: input.yield_factor,
        });
    }

    Ok(Ingredient {
        ingredient_id: id,
        name: input.name,
        purchase_unit: input.purchase_unit,
        purchase_price: input.purchase_price,
        recipe_unit: input.recipe_unit,
        yield_factor: input.yield_factor,
        package_type: input.package_type,
        net_quantity: input.net_quantity,
        net_unit: input.net_unit,
        conversions: created_conversions,
    })
}

#[tauri::command]
pub fn update_ingredient(
    state: State<DbState>,
    ingredient_id: i64,
    input: IngredientInput,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Determine primary recipe_unit and yield_factor from input or first conversion
    let primary_unit = if let Some(first_conv) = input.conversions.first() {
        first_conv.recipe_unit.clone()
    } else {
        input.recipe_unit.clone()
    };
    let primary_yield = if let Some(first_conv) = input.conversions.first() {
        first_conv.yield_factor
    } else {
        input.yield_factor
    };

    conn.execute(
        "UPDATE ingredients SET name=?1, purchase_unit=?2, purchase_price=?3,
         recipe_unit=?4, yield_factor=?5, package_type=?6, net_quantity=?7, net_unit=?8,
         updated_at=datetime('now')
         WHERE ingredient_id=?9",
        params![
            input.name,
            input.purchase_unit,
            input.purchase_price,
            primary_unit,
            primary_yield,
            input.package_type,
            input.net_quantity,
            input.net_unit,
            ingredient_id
        ],
    )
    .map_err(|e| e.to_string())?;

    // Synchronize conversions
    if !input.conversions.is_empty() {
        let mut keep_ids = Vec::new();
        for conv in &input.conversions {
            if let Some(cid) = conv.conversion_id {
                conn.execute(
                    "UPDATE ingredient_conversions SET recipe_unit=?1, yield_factor=?2 WHERE conversion_id=?3 AND ingredient_id=?4",
                    params![conv.recipe_unit, conv.yield_factor, cid, ingredient_id],
                )
                .map_err(|e| e.to_string())?;
                keep_ids.push(cid);
            } else {
                conn.execute(
                    "INSERT INTO ingredient_conversions (ingredient_id, recipe_unit, yield_factor) VALUES (?1, ?2, ?3)",
                    params![ingredient_id, conv.recipe_unit, conv.yield_factor],
                )
                .map_err(|e| e.to_string())?;
                keep_ids.push(conn.last_insert_rowid());
            }
        }

        // Clean up deleted conversion records
        if !keep_ids.is_empty() {
            let placeholders = keep_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let delete_sql = format!(
                "DELETE FROM ingredient_conversions WHERE ingredient_id=? AND conversion_id NOT IN ({})",
                placeholders
            );
            let mut del_params: Vec<&dyn rusqlite::ToSql> = Vec::new();
            del_params.push(&ingredient_id);
            for id_ref in &keep_ids {
                del_params.push(id_ref);
            }
            let _ = conn.execute(&delete_sql, rusqlite::params_from_iter(del_params));
        }
    }

    Ok(())
}

#[tauri::command]
pub fn delete_ingredient(state: State<DbState>, ingredient_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM ingredients WHERE ingredient_id=?1",
        params![ingredient_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Recipes ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_recipes(state: State<DbState>) -> Result<Vec<Recipe>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT r.recipe_id, r.name, r.yield_qty, r.labor_cost, r.electricity_cost,
                    r.other_overhead, r.target_markup_pct, r.reseller_markup_pct, r.desired_profit_alert,
                    COALESCE((
                        SELECT SUM(ri.batch_qty * (i.purchase_price / CASE WHEN COALESCE(ic.yield_factor, i.yield_factor) != 0.0 THEN COALESCE(ic.yield_factor, i.yield_factor) ELSE 1.0 END))
                        FROM recipe_ingredients ri
                        JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
                        LEFT JOIN ingredient_conversions ic ON ic.conversion_id = ri.conversion_id
                        WHERE ri.recipe_id = r.recipe_id
                    ), 0.0) AS ingredient_cost
             FROM recipes r ORDER BY r.name ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map([], |row| {
            let recipe_id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let yield_qty: f64 = row.get(2)?;
            let labor_cost: f64 = row.get(3)?;
            let electricity_cost: f64 = row.get(4)?;
            let other_overhead: f64 = row.get(5)?;
            let target_markup_pct: f64 = row.get(6)?;
            let reseller_markup_pct: f64 = row.get(7)?;
            let desired_profit_alert: f64 = row.get(8)?;
            let ingredient_cost: f64 = row.get(9)?;

            let total_overhead = labor_cost + electricity_cost + other_overhead;
            let total_batch_cost = ingredient_cost + total_overhead;
            let unit_cost = if yield_qty > 0.0 {
                total_batch_cost / yield_qty
            } else {
                0.0
            };
            let unit_retail_price = unit_cost * (1.0 + target_markup_pct / 100.0);

            Ok(Recipe {
                recipe_id,
                name,
                yield_qty,
                labor_cost,
                electricity_cost,
                other_overhead,
                target_markup_pct,
                reseller_markup_pct,
                desired_profit_alert,
                ingredient_cost,
                unit_retail_price,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub fn create_recipe(state: State<DbState>, input: RecipeInput) -> Result<Recipe, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO recipes (name, yield_qty, labor_cost, electricity_cost, other_overhead,
         target_markup_pct, reseller_markup_pct, desired_profit_alert)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            input.name,
            input.yield_qty,
            input.labor_cost,
            input.electricity_cost,
            input.other_overhead,
            input.target_markup_pct,
            input.reseller_markup_pct,
            input.desired_profit_alert
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let total_overhead = input.labor_cost + input.electricity_cost + input.other_overhead;
    let unit_cost = if input.yield_qty > 0.0 {
        total_overhead / input.yield_qty
    } else {
        0.0
    };
    let unit_retail_price = unit_cost * (1.0 + input.target_markup_pct / 100.0);

    Ok(Recipe {
        recipe_id: id,
        name: input.name,
        yield_qty: input.yield_qty,
        labor_cost: input.labor_cost,
        electricity_cost: input.electricity_cost,
        other_overhead: input.other_overhead,
        target_markup_pct: input.target_markup_pct,
        reseller_markup_pct: input.reseller_markup_pct,
        desired_profit_alert: input.desired_profit_alert,
        ingredient_cost: 0.0,
        unit_retail_price,
    })
}

#[tauri::command]
pub fn update_recipe(
    state: State<DbState>,
    recipe_id: i64,
    input: RecipeInput,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE recipes SET name=?1, yield_qty=?2, labor_cost=?3, electricity_cost=?4,
         other_overhead=?5, target_markup_pct=?6, reseller_markup_pct=?7,
         desired_profit_alert=?8, updated_at=datetime('now')
         WHERE recipe_id=?9",
        params![
            input.name,
            input.yield_qty,
            input.labor_cost,
            input.electricity_cost,
            input.other_overhead,
            input.target_markup_pct,
            input.reseller_markup_pct,
            input.desired_profit_alert,
            recipe_id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_recipe(state: State<DbState>, recipe_id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM recipes WHERE recipe_id=?1", params![recipe_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Recipe Ingredients ───────────────────────────────────────────────────────

#[tauri::command]
pub fn get_recipe_ingredients(
    state: State<DbState>,
    recipe_id: i64,
) -> Result<Vec<RecipeIngredient>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT ri.id, ri.recipe_id, ri.ingredient_id, ri.conversion_id, ri.batch_qty,
                    i.name, i.purchase_unit, i.purchase_price,
                    COALESCE(ic.recipe_unit, i.recipe_unit) AS recipe_unit,
                    COALESCE(ic.yield_factor, i.yield_factor) AS yield_factor,
                    COALESCE(i.package_type, 'Package'),
                    COALESCE(i.net_quantity, 1.0),
                    COALESCE(i.net_unit, 'Kilogram'),
                    CASE WHEN ri.conversion_id IS NOT NULL AND ic.conversion_id IS NULL THEN 1 ELSE 0 END AS is_orphaned
             FROM recipe_ingredients ri
             JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
             LEFT JOIN ingredient_conversions ic ON ic.conversion_id = ri.conversion_id
             WHERE ri.recipe_id = ?1
             ORDER BY i.name ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![recipe_id], |row| {
            let id: i64 = row.get(0)?;
            let recipe_id: i64 = row.get(1)?;
            let ingredient_id: i64 = row.get(2)?;
            let conversion_id: Option<i64> = row.get(3)?;
            let batch_qty: f64 = row.get(4)?;
            let ingredient_name: String = row.get(5)?;
            let purchase_unit: String = row.get(6)?;
            let purchase_price: f64 = row.get(7)?;
            let recipe_unit: String = row.get(8)?;
            let yield_factor: f64 = row.get(9)?;
            let package_type: String = row.get(10)?;
            let net_quantity: f64 = row.get(11)?;
            let net_unit: String = row.get(12)?;
            let is_orphaned_int: i32 = row.get(13)?;
            let is_orphaned_conversion = is_orphaned_int == 1;

            let normalized_unit_cost = if yield_factor != 0.0 {
                purchase_price / yield_factor
            } else {
                0.0
            };
            let line_item_cost = batch_qty * normalized_unit_cost;

            Ok(RecipeIngredient {
                id,
                recipe_id,
                ingredient_id,
                conversion_id,
                batch_qty,
                ingredient_name,
                purchase_unit,
                purchase_price,
                recipe_unit,
                yield_factor,
                package_type,
                net_quantity,
                net_unit,
                is_orphaned_conversion,
                normalized_unit_cost,
                line_item_cost,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub fn upsert_recipe_ingredient(
    state: State<DbState>,
    recipe_id: i64,
    input: RecipeIngredientInput,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // If updating an existing line item directly by row ID
    if let Some(line_id) = input.id {
        let resolved_conversion_id: Option<i64> = match input.conversion_id {
            Some(cid) => Some(cid),
            None => conn
                .query_row(
                    "SELECT conversion_id FROM recipe_ingredients WHERE id=?1",
                    params![line_id],
                    |row| row.get(0),
                )
                .ok()
                .flatten(),
        };

        conn.execute(
            "UPDATE recipe_ingredients 
             SET batch_qty = ?1, 
                 conversion_id = ?2 
             WHERE id = ?3 AND recipe_id = ?4",
            params![input.batch_qty, resolved_conversion_id, line_id, recipe_id],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE constraint failed") {
                "This recipe unit is already used for this ingredient in this recipe.".to_string()
            } else {
                e.to_string()
            }
        })?;
        return Ok(());
    }

    // Adding a new line item: check multi-occurrence rule
    let conversion_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM ingredient_conversions WHERE ingredient_id = ?1",
            params![input.ingredient_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let existing_occurrences: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = ?1 AND ingredient_id = ?2",
            params![recipe_id, input.ingredient_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if conversion_count <= 1 && existing_occurrences >= 1 {
        return Err("Ingredient only has a single Kitchen Recipe Unit. Multiple occurrences in the same recipe are strictly prohibited.".to_string());
    }

    let resolved_conversion_id: Option<i64> = match input.conversion_id {
        Some(cid) => Some(cid),
        None => conn
            .query_row(
                "SELECT conversion_id FROM ingredient_conversions WHERE ingredient_id=?1 ORDER BY conversion_id ASC LIMIT 1",
                params![input.ingredient_id],
                |row| row.get(0),
            )
            .ok(),
    };

    conn.execute(
        "INSERT INTO recipe_ingredients (recipe_id, ingredient_id, conversion_id, batch_qty)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(recipe_id, ingredient_id, conversion_id) DO UPDATE SET
            batch_qty = excluded.batch_qty",
        params![recipe_id, input.ingredient_id, resolved_conversion_id, input.batch_qty],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn remove_recipe_ingredient(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM recipe_ingredients WHERE id=?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Costing Engine ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn calculate_recipe_cost(
    state: State<DbState>,
    recipe_id: i64,
) -> Result<RecipeCostResult, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Fetch recipe
    let mut recipe = conn
        .query_row(
            "SELECT recipe_id, name, yield_qty, labor_cost, electricity_cost,
                    other_overhead, target_markup_pct, reseller_markup_pct, desired_profit_alert
             FROM recipes WHERE recipe_id=?1",
            params![recipe_id],
            |row| {
                Ok(Recipe {
                    recipe_id: row.get(0)?,
                    name: row.get(1)?,
                    yield_qty: row.get(2)?,
                    labor_cost: row.get(3)?,
                    electricity_cost: row.get(4)?,
                    other_overhead: row.get(5)?,
                    target_markup_pct: row.get(6)?,
                    reseller_markup_pct: row.get(7)?,
                    desired_profit_alert: row.get(8)?,
                    ingredient_cost: 0.0,
                    unit_retail_price: 0.0,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    // Fetch line items with multi-unit conversion JOIN
    let mut stmt = conn
        .prepare(
            "SELECT ri.id, ri.recipe_id, ri.ingredient_id, ri.conversion_id, ri.batch_qty,
                    i.name, i.purchase_unit, i.purchase_price,
                    COALESCE(ic.recipe_unit, i.recipe_unit) AS recipe_unit,
                    COALESCE(ic.yield_factor, i.yield_factor) AS yield_factor,
                    COALESCE(i.package_type, 'Package'),
                    COALESCE(i.net_quantity, 1.0),
                    COALESCE(i.net_unit, 'Kilogram'),
                    CASE WHEN ri.conversion_id IS NOT NULL AND ic.conversion_id IS NULL THEN 1 ELSE 0 END AS is_orphaned
             FROM recipe_ingredients ri
             JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
             LEFT JOIN ingredient_conversions ic ON ic.conversion_id = ri.conversion_id
             WHERE ri.recipe_id = ?1
             ORDER BY i.name ASC",
        )
        .map_err(|e| e.to_string())?;

    let line_items: Vec<RecipeIngredient> = stmt
        .query_map(params![recipe_id], |row| {
            let id: i64 = row.get(0)?;
            let recipe_id: i64 = row.get(1)?;
            let ingredient_id: i64 = row.get(2)?;
            let conversion_id: Option<i64> = row.get(3)?;
            let batch_qty: f64 = row.get(4)?;
            let ingredient_name: String = row.get(5)?;
            let purchase_unit: String = row.get(6)?;
            let purchase_price: f64 = row.get(7)?;
            let recipe_unit: String = row.get(8)?;
            let yield_factor: f64 = row.get(9)?;
            let package_type: String = row.get(10)?;
            let net_quantity: f64 = row.get(11)?;
            let net_unit: String = row.get(12)?;
            let is_orphaned_int: i32 = row.get(13)?;
            let is_orphaned_conversion = is_orphaned_int == 1;

            let normalized_unit_cost = if yield_factor != 0.0 {
                purchase_price / yield_factor
            } else {
                0.0
            };
            let line_item_cost = batch_qty * normalized_unit_cost;
            Ok(RecipeIngredient {
                id,
                recipe_id,
                ingredient_id,
                conversion_id,
                batch_qty,
                ingredient_name,
                purchase_unit,
                purchase_price,
                recipe_unit,
                yield_factor,
                package_type,
                net_quantity,
                net_unit,
                is_orphaned_conversion,
                normalized_unit_cost,
                line_item_cost,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // ── Business logic (floating-point precision maintained) ─────────────────
    let total_variable_cost: f64 = line_items.iter().map(|li| li.line_item_cost).sum();
    let total_overhead = recipe.labor_cost + recipe.electricity_cost + recipe.other_overhead;
    let total_cost_per_batch = total_variable_cost + total_overhead;

    let cost_per_item = if recipe.yield_qty != 0.0 {
        total_cost_per_batch / recipe.yield_qty
    } else {
        0.0
    };

    // ── Markup normalization (whole-number UI input → decimal) ────────────
    // User types "50" in UI → stored as 50.0 → divided by 100 → 0.50
    let retail_markup_decimal = recipe.target_markup_pct / 100.0;
    let reseller_markup_decimal = recipe.reseller_markup_pct / 100.0;

    let retail_price_per_item = cost_per_item * (1.0 + retail_markup_decimal);
    let reseller_price_per_item = cost_per_item * (1.0 + reseller_markup_decimal);
    let gross_profit_per_batch =
        (retail_price_per_item * recipe.yield_qty) - total_cost_per_batch;
    let profit_alert_triggered = gross_profit_per_batch < recipe.desired_profit_alert;

    // ── New profitability metrics (f64, unrounded) ───────────────────────
    // Recommended Retail Price / Item = Cost/Item × (1 + markup%)
    let recommended_retail_price_item = retail_price_per_item;

    // Gross Profit / Item = Retail Price − Cost
    let gross_profit_item = recommended_retail_price_item - cost_per_item;

    // Gross Margin % = (Gross Profit / Retail Price) × 100
    let gross_margin_pct = if recommended_retail_price_item != 0.0 {
        (gross_profit_item / recommended_retail_price_item) * 100.0
    } else {
        0.0
    };

    // Retail Revenue / Batch = Retail Price × Items per Batch
    let retail_revenue_batch = recommended_retail_price_item * recipe.yield_qty;

    recipe.ingredient_cost = total_variable_cost;
    recipe.unit_retail_price = recommended_retail_price_item;

    Ok(RecipeCostResult {
        recipe,
        line_items,
        total_variable_cost,
        total_overhead,
        total_cost_per_batch,
        cost_per_item,
        retail_price_per_item,
        reseller_price_per_item,
        gross_profit_per_batch,
        profit_alert_triggered,
        recommended_retail_price_item,
        gross_profit_item,
        gross_margin_pct,
        retail_revenue_batch,
    })
}

// ── Settings ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_settings(state: State<DbState>) -> Result<Vec<AppSetting>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT setting_key, setting_value FROM app_settings ORDER BY setting_key")
        .map_err(|e| e.to_string())?;

    let settings = stmt
        .query_map([], |row| {
            Ok(AppSetting {
                setting_key: row.get(0)?,
                setting_value: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(settings)
}

#[tauri::command]
pub fn set_setting(
    state: State<DbState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO app_settings (setting_key, setting_value) VALUES (?1, ?2)
         ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Export ────────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn export_data_csv(state: State<DbState>, recipe_id: i64) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let recipe: Recipe = conn
        .query_row(
            "SELECT recipe_id, name, yield_qty, labor_cost, electricity_cost,
                    other_overhead, target_markup_pct, reseller_markup_pct, desired_profit_alert
             FROM recipes WHERE recipe_id=?1",
            params![recipe_id],
            |row| {
                Ok(Recipe {
                    recipe_id: row.get(0)?,
                    name: row.get(1)?,
                    yield_qty: row.get(2)?,
                    labor_cost: row.get(3)?,
                    electricity_cost: row.get(4)?,
                    other_overhead: row.get(5)?,
                    target_markup_pct: row.get(6)?,
                    reseller_markup_pct: row.get(7)?,
                    desired_profit_alert: row.get(8)?,
                    ingredient_cost: 0.0,
                    unit_retail_price: 0.0,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let mut wtr = csv::Writer::from_writer(vec![]);
    wtr.write_record(["Recipe", "Ingredient", "Purchase Unit", "Purchase Price",
        "Recipe Unit", "Yield Factor", "Normalized Unit Cost", "Batch Qty", "Line Item Cost"])
        .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT ri.batch_qty, i.name, i.purchase_unit, i.purchase_price, i.recipe_unit, i.yield_factor
             FROM recipe_ingredients ri JOIN ingredients i ON i.ingredient_id=ri.ingredient_id
             WHERE ri.recipe_id=?1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_map(params![recipe_id], |row| {
        let batch_qty: f64 = row.get(0)?;
        let purchase_price: f64 = row.get(3)?;
        let yield_factor: f64 = row.get(5)?;
        Ok((
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            purchase_price,
            row.get::<_, String>(4)?,
            yield_factor,
            batch_qty,
        ))
    })
    .map_err(|e| e.to_string())?
    .for_each(|r| {
        if let Ok((name, pu, pp, ru, yf, bq)) = r {
            let nuc = if yf != 0.0 { pp / yf } else { 0.0 };
            let lic = bq * nuc;
            let _ = wtr.write_record([
                recipe.name.as_str(),
                name.as_str(),
                pu.as_str(),
                &format!("{:.4}", pp),
                ru.as_str(),
                &format!("{:.4}", yf),
                &format!("{:.4}", nuc),
                &format!("{:.4}", bq),
                &format!("{:.4}", lic),
            ]);
        }
    });

    let data = String::from_utf8(wtr.into_inner().map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    Ok(data)
}

#[tauri::command]
pub fn backup_database(
    app_handle: tauri::AppHandle,
    state: State<DbState>,
    backup_path: String,
) -> Result<String, String> {
    let source = get_db_path(&app_handle);
    let dest_dir = if backup_path.is_empty() {
        source
            .parent()
            .unwrap()
            .join("Backups")
    } else {
        std::path::PathBuf::from(&backup_path)
    };

    std::fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let dest = dest_dir.join(format!("pricing_calculator_{}.db", timestamp));
    std::fs::copy(&source, &dest).map_err(|e| e.to_string())?;

    // Update last backup time
    {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE app_settings SET setting_value=?1 WHERE setting_key='last_backup'",
            params![chrono::Local::now().to_rfc3339()],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(dest.to_string_lossy().to_string())
}
