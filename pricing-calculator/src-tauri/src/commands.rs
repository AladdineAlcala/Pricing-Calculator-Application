// Tauri IPC command handlers — ingredients CRUD + recipe costing engine
use crate::db::get_db_path;
use crate::models::*;
use rusqlite::{params, Connection};
use std::sync::Mutex;
use tauri::State;

pub struct DbState(pub Mutex<Connection>);

// ── Units (v2.0) ─────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_units(state: State<DbState>) -> Result<Vec<Unit>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT unit_id, code, name, unit_type, is_base FROM units ORDER BY unit_type ASC, name ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map([], |row| {
            Ok(Unit {
                unit_id: row.get(0)?,
                code: row.get(1)?,
                name: row.get(2)?,
                unit_type: row.get(3)?,
                is_base: row.get::<_, i32>(4)? == 1,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}

// ── Ingredient Purchases (v2.0) ──────────────────────────────────────────────

#[tauri::command]
pub fn get_ingredient_purchases(
    state: State<DbState>,
    ingredient_id: i64,
) -> Result<Vec<IngredientPurchase>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT purchase_id, ingredient_id, supplier_name, package_quantity,
                    package_unit_id, purchase_price, purchase_date, is_active
             FROM ingredient_purchases
             WHERE ingredient_id = ?1 AND is_active = 1
             ORDER BY purchase_date DESC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![ingredient_id], |row| {
            Ok(IngredientPurchase {
                purchase_id: row.get(0)?,
                ingredient_id: row.get(1)?,
                supplier_name: row.get(2)?,
                package_quantity: row.get(3)?,
                package_unit_id: row.get(4)?,
                purchase_price: row.get(5)?,
                purchase_date: row.get(6)?,
                is_active: row.get::<_, i32>(7)? == 1,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub fn create_ingredient_purchase(
    state: State<DbState>,
    ingredient_id: i64,
    input: IngredientPurchaseInput,
) -> Result<IngredientPurchase, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO ingredient_purchases (ingredient_id, supplier_name, package_quantity, package_unit_id, purchase_price, is_active)
         VALUES (?1, ?2, ?3, ?4, ?5, 1)",
        params![
            ingredient_id,
            input.supplier_name,
            input.package_quantity,
            input.package_unit_id,
            input.purchase_price
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(IngredientPurchase {
        purchase_id: id,
        ingredient_id,
        supplier_name: input.supplier_name,
        package_quantity: input.package_quantity,
        package_unit_id: input.package_unit_id,
        purchase_price: input.purchase_price,
        purchase_date: chrono::Local::now().to_rfc3339(),
        is_active: true,
    })
}

#[tauri::command]
pub fn update_ingredient_purchase(
    state: State<DbState>,
    purchase_id: i64,
    input: IngredientPurchaseInput,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE ingredient_purchases SET supplier_name=?1, package_quantity=?2,
         package_unit_id=?3, purchase_price=?4
         WHERE purchase_id=?5",
        params![
            input.supplier_name,
            input.package_quantity,
            input.package_unit_id,
            input.purchase_price,
            purchase_id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_ingredient_purchase(
    state: State<DbState>,
    purchase_id: i64,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // Soft-delete: set is_active = 0
    conn.execute(
        "UPDATE ingredient_purchases SET is_active = 0 WHERE purchase_id = ?1",
        params![purchase_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Ingredients ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_ingredients(state: State<DbState>) -> Result<Vec<Ingredient>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Load conversions map (includes v2.0 base-unit fields)
    let mut conv_map: std::collections::HashMap<i64, Vec<IngredientConversion>> =
        std::collections::HashMap::new();
    let mut conv_stmt = conn
        .prepare(
            "SELECT conversion_id, ingredient_id, recipe_unit, yield_factor,
                    from_unit_id, to_unit_id, conversion_factor, source, effective_date,
                    COALESCE(is_active, 1)
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
                from_unit_id: row.get(4)?,
                to_unit_id: row.get(5)?,
                conversion_factor: row.get(6)?,
                source: row.get(7)?,
                effective_date: row.get(8)?,
                is_active: row.get::<_, i32>(9)? == 1,
            })
        })
        .map_err(|e| e.to_string())?;

    for conv in conv_rows.flatten() {
        conv_map.entry(conv.ingredient_id).or_default().push(conv);
    }

    // Load purchases map (v2.0)
    let mut purchase_map: std::collections::HashMap<i64, Vec<IngredientPurchase>> =
        std::collections::HashMap::new();
    let mut purch_stmt = conn
        .prepare(
            "SELECT purchase_id, ingredient_id, supplier_name, package_quantity,
                    package_unit_id, purchase_price, purchase_date, is_active
             FROM ingredient_purchases WHERE is_active = 1
             ORDER BY purchase_date DESC",
        )
        .map_err(|e| e.to_string())?;

    let purch_rows = purch_stmt
        .query_map([], |row| {
            Ok(IngredientPurchase {
                purchase_id: row.get(0)?,
                ingredient_id: row.get(1)?,
                supplier_name: row.get(2)?,
                package_quantity: row.get(3)?,
                package_unit_id: row.get(4)?,
                purchase_price: row.get(5)?,
                purchase_date: row.get(6)?,
                is_active: row.get::<_, i32>(7)? == 1,
            })
        })
        .map_err(|e| e.to_string())?;

    for purch in purch_rows.flatten() {
        purchase_map.entry(purch.ingredient_id).or_default().push(purch);
    }

    let mut stmt = conn
        .prepare(
            "SELECT ingredient_id, name, purchase_unit, purchase_price, recipe_unit, yield_factor,
                    COALESCE(package_type, 'Package'), COALESCE(net_quantity, 1.0), COALESCE(net_unit, 'Kilogram'),
                    COALESCE(current_stock_qty, 0.0), COALESCE(reorder_threshold, 0.0), supplier, sku,
                    base_unit_id, category
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
            let current_stock_qty: f64 = row.get(9)?;
            let reorder_threshold: f64 = row.get(10)?;
            let supplier: Option<String> = row.get(11)?;
            let sku: Option<String> = row.get(12)?;
            let base_unit_id: Option<i64> = row.get(13)?;
            let category: Option<String> = row.get(14)?;

            let conversions = conv_map.remove(&ingredient_id).unwrap_or_else(|| {
                vec![IngredientConversion {
                    conversion_id: 0,
                    ingredient_id,
                    recipe_unit: recipe_unit.clone(),
                    yield_factor,
                    from_unit_id: None,
                    to_unit_id: None,
                    conversion_factor: None,
                    source: None,
                    effective_date: None,
                    is_active: true,
                }]
            });

            let purchases = purchase_map.remove(&ingredient_id).unwrap_or_default();

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
                current_stock_qty,
                reorder_threshold,
                supplier,
                sku,
                conversions,
                base_unit_id,
                category,
                purchases,
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
        "INSERT INTO ingredients (name, purchase_unit, purchase_price, recipe_unit, yield_factor, package_type, net_quantity, net_unit, current_stock_qty, reorder_threshold, supplier, sku, base_unit_id, category)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            input.name,
            input.purchase_unit,
            input.purchase_price,
            input.recipe_unit,
            input.yield_factor,
            input.package_type,
            input.net_quantity,
            input.net_unit,
            input.current_stock_qty,
            input.reorder_threshold,
            input.supplier,
            input.sku,
            input.base_unit_id,
            input.category,
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let mut created_conversions = Vec::new();

    if !input.conversions.is_empty() {
        for conv in &input.conversions {
            conn.execute(
                "INSERT INTO ingredient_conversions (ingredient_id, recipe_unit, yield_factor, from_unit_id, to_unit_id, conversion_factor, source, is_active)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)",
                params![
                    id,
                    conv.recipe_unit,
                    conv.yield_factor,
                    conv.from_unit_id,
                    conv.to_unit_id,
                    conv.conversion_factor,
                    conv.source
                ],
            )
            .map_err(|e| e.to_string())?;
            let cid = conn.last_insert_rowid();
            created_conversions.push(IngredientConversion {
                conversion_id: cid,
                ingredient_id: id,
                recipe_unit: conv.recipe_unit.clone(),
                yield_factor: conv.yield_factor,
                from_unit_id: conv.from_unit_id,
                to_unit_id: conv.to_unit_id,
                conversion_factor: conv.conversion_factor,
                source: conv.source.clone(),
                effective_date: None,
                is_active: true,
            });
        }
    } else {
        conn.execute(
            "INSERT INTO ingredient_conversions (ingredient_id, recipe_unit, yield_factor, is_active) VALUES (?1, ?2, ?3, 1)",
            params![id, input.recipe_unit, input.yield_factor],
        )
        .map_err(|e| e.to_string())?;
        let cid = conn.last_insert_rowid();
        created_conversions.push(IngredientConversion {
            conversion_id: cid,
            ingredient_id: id,
            recipe_unit: input.recipe_unit.clone(),
            yield_factor: input.yield_factor,
            from_unit_id: None,
            to_unit_id: None,
            conversion_factor: None,
            source: None,
            effective_date: None,
            is_active: true,
        });
    }

    let mut created_purchases = Vec::new();
    for p in &input.purchases {
        conn.execute(
            "INSERT INTO ingredient_purchases (ingredient_id, supplier_name, package_quantity, package_unit_id, purchase_price, is_active)
             VALUES (?1, ?2, ?3, ?4, ?5, 1)",
            params![
                id,
                p.supplier_name,
                p.package_quantity,
                p.package_unit_id,
                p.purchase_price
            ],
        )
        .map_err(|e| e.to_string())?;
        let pid = conn.last_insert_rowid();
        created_purchases.push(IngredientPurchase {
            purchase_id: pid,
            ingredient_id: id,
            supplier_name: p.supplier_name.clone(),
            package_quantity: p.package_quantity,
            package_unit_id: p.package_unit_id,
            purchase_price: p.purchase_price,
            purchase_date: chrono::Local::now().to_rfc3339(),
            is_active: true,
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
        current_stock_qty: input.current_stock_qty,
        reorder_threshold: input.reorder_threshold,
        supplier: input.supplier,
        sku: input.sku,
        conversions: created_conversions,
        base_unit_id: input.base_unit_id,
        category: input.category,
        purchases: created_purchases,
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
         current_stock_qty=?9, reorder_threshold=?10, supplier=?11, sku=?12,
         base_unit_id=?13, category=?14, updated_at=datetime('now')
         WHERE ingredient_id=?15",
        params![
            input.name,
            input.purchase_unit,
            input.purchase_price,
            primary_unit,
            primary_yield,
            input.package_type,
            input.net_quantity,
            input.net_unit,
            input.current_stock_qty,
            input.reorder_threshold,
            input.supplier,
            input.sku,
            input.base_unit_id,
            input.category,
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
                    "UPDATE ingredient_conversions SET recipe_unit=?1, yield_factor=?2,
                     from_unit_id=?3, to_unit_id=?4, conversion_factor=?5, source=?6
                     WHERE conversion_id=?7 AND ingredient_id=?8",
                    params![
                        conv.recipe_unit,
                        conv.yield_factor,
                        conv.from_unit_id,
                        conv.to_unit_id,
                        conv.conversion_factor,
                        conv.source,
                        cid,
                        ingredient_id
                    ],
                )
                .map_err(|e| e.to_string())?;
                keep_ids.push(cid);
            } else {
                conn.execute(
                    "INSERT INTO ingredient_conversions (ingredient_id, recipe_unit, yield_factor, from_unit_id, to_unit_id, conversion_factor, source, is_active)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)",
                    params![
                        ingredient_id,
                        conv.recipe_unit,
                        conv.yield_factor,
                        conv.from_unit_id,
                        conv.to_unit_id,
                        conv.conversion_factor,
                        conv.source
                    ],
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
                    CASE WHEN ri.conversion_id IS NOT NULL AND ic.conversion_id IS NULL THEN 1 ELSE 0 END AS is_orphaned,
                    ic.conversion_factor,
                    bu.code AS base_unit_code
             FROM recipe_ingredients ri
             JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
             LEFT JOIN ingredient_conversions ic ON ic.conversion_id = ri.conversion_id
             LEFT JOIN units bu ON bu.unit_id = i.base_unit_id
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
            let conversion_factor: Option<f64> = row.get(14)?;
            let base_unit_code: Option<String> = row.get(15)?;

            let (normalized_unit_cost, line_item_cost, effective_yield, base_cost, norm_qty) = match (conversion_factor, base_unit_code.as_deref()) {
                (Some(factor), Some(base_code)) if factor > 0.0 => {
                    let package_base_qty = normalize_to_base_unit(net_quantity, &net_unit, base_code);
                    let base_unit_cost = if package_base_qty > 0.0 {
                        purchase_price / package_base_qty
                    } else {
                        0.0
                    };
                    let normalized_recipe_qty = if recipe_unit.trim().eq_ignore_ascii_case(base_code) {
                        batch_qty
                    } else {
                        batch_qty * factor
                    };
                    let cost = normalized_recipe_qty * base_unit_cost;
                    let unit_cost = if batch_qty > 0.0 { cost / batch_qty } else { 0.0 };
                    let derived_yf = if normalized_recipe_qty > 0.0 {
                        package_base_qty / (normalized_recipe_qty / batch_qty)
                    } else {
                        yield_factor
                    };
                    (unit_cost, cost, derived_yf, Some(base_unit_cost), Some(normalized_recipe_qty))
                }
                _ => {
                    let nuc = if yield_factor != 0.0 {
                        purchase_price / yield_factor
                    } else {
                        0.0
                    };
                    (nuc, batch_qty * nuc, yield_factor, None, None)
                }
            };

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
                yield_factor: effective_yield,
                package_type,
                net_quantity,
                net_unit,
                is_orphaned_conversion,
                normalized_unit_cost,
                line_item_cost,
                base_unit_code,
                base_unit_cost: base_cost,
                normalized_quantity: norm_qty,
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
                    CASE WHEN ri.conversion_id IS NOT NULL AND ic.conversion_id IS NULL THEN 1 ELSE 0 END AS is_orphaned,
                    ic.conversion_factor,
                    bu.code AS base_unit_code
             FROM recipe_ingredients ri
             JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
             LEFT JOIN ingredient_conversions ic ON ic.conversion_id = ri.conversion_id
             LEFT JOIN units bu ON bu.unit_id = i.base_unit_id
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
            let conversion_factor: Option<f64> = row.get(14)?;
            let base_unit_code: Option<String> = row.get(15)?;

            // ── v2.0 Base-Unit Normalization Pipeline (Dual-Mode Safety) ─────
            let (normalized_unit_cost, line_item_cost, effective_yield, base_cost, norm_qty) = match (conversion_factor, base_unit_code.as_deref()) {
                (Some(factor), Some(base_code)) if factor > 0.0 => {
                    let package_base_qty = normalize_to_base_unit(net_quantity, &net_unit, base_code);
                    let base_unit_cost = if package_base_qty > 0.0 {
                        purchase_price / package_base_qty
                    } else {
                        0.0
                    };
                    let normalized_recipe_qty = if recipe_unit.trim().eq_ignore_ascii_case(base_code) {
                        batch_qty
                    } else {
                        batch_qty * factor
                    };
                    let cost = normalized_recipe_qty * base_unit_cost;
                    let unit_cost = if batch_qty > 0.0 { cost / batch_qty } else { 0.0 };
                    let derived_yf = if normalized_recipe_qty > 0.0 {
                        package_base_qty / (normalized_recipe_qty / batch_qty)
                    } else {
                        yield_factor
                    };
                    (unit_cost, cost, derived_yf, Some(base_unit_cost), Some(normalized_recipe_qty))
                }
                _ => {
                    let nuc = if yield_factor != 0.0 {
                        purchase_price / yield_factor
                    } else {
                        0.0
                    };
                    (nuc, batch_qty * nuc, yield_factor, None, None)
                }
            };

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
                yield_factor: effective_yield,
                package_type,
                net_quantity,
                net_unit,
                is_orphaned_conversion,
                normalized_unit_cost,
                line_item_cost,
                base_unit_code,
                base_unit_cost: base_cost,
                normalized_quantity: norm_qty,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // ── Fetch packaging line items ──────────────────────────────────────────
    let mut pkg_stmt = conn
        .prepare(
            "SELECT rp.id, rp.recipe_id, rp.packaging_id, rp.batch_qty,
                    p.packaging_code, p.name, p.packaging_type, p.unit, p.current_unit_cost
             FROM recipe_packaging rp
             JOIN packaging p ON p.packaging_id = rp.packaging_id
             WHERE rp.recipe_id = ?1
             ORDER BY p.name ASC",
        )
        .map_err(|e| e.to_string())?;

    let packaging_items: Vec<RecipePackaging> = pkg_stmt
        .query_map(params![recipe_id], |row| {
            let id: i64 = row.get(0)?;
            let recipe_id: i64 = row.get(1)?;
            let packaging_id: i64 = row.get(2)?;
            let batch_qty: f64 = row.get(3)?;
            let packaging_code: String = row.get(4)?;
            let packaging_name: String = row.get(5)?;
            let packaging_type: String = row.get(6)?;
            let unit: String = row.get(7)?;
            let current_unit_cost: f64 = row.get(8)?;
            let line_item_cost = batch_qty * current_unit_cost;

            Ok(RecipePackaging {
                id,
                recipe_id,
                packaging_id,
                batch_qty,
                packaging_code,
                packaging_name,
                packaging_type,
                unit,
                current_unit_cost,
                line_item_cost,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // ── Business logic (floating-point precision maintained) ─────────────────
    let total_ingredient_cost: f64 = line_items.iter().map(|li| li.line_item_cost).sum();
    let total_packaging_cost: f64 = packaging_items.iter().map(|pi| pi.line_item_cost).sum();
    let total_variable_cost: f64 = total_ingredient_cost + total_packaging_cost;
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

    recipe.ingredient_cost = total_ingredient_cost;
    recipe.unit_retail_price = recommended_retail_price_item;

    Ok(RecipeCostResult {
        recipe,
        line_items,
        packaging_items,
        total_ingredient_cost,
        total_packaging_cost,
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
            "SELECT ri.batch_qty, i.name, i.purchase_unit, i.purchase_price,
                    COALESCE(ic.recipe_unit, i.recipe_unit) AS recipe_unit,
                    COALESCE(ic.yield_factor, i.yield_factor) AS yield_factor,
                    ic.conversion_factor, bu.code AS base_unit_code,
                    COALESCE(i.net_quantity, 1.0), COALESCE(i.net_unit, 'Kilogram')
             FROM recipe_ingredients ri
             JOIN ingredients i ON i.ingredient_id=ri.ingredient_id
             LEFT JOIN ingredient_conversions ic ON ic.conversion_id = ri.conversion_id
             LEFT JOIN units bu ON bu.unit_id = i.base_unit_id
             WHERE ri.recipe_id=?1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_map(params![recipe_id], |row| {
        let batch_qty: f64 = row.get(0)?;
        let name: String = row.get(1)?;
        let purchase_unit: String = row.get(2)?;
        let purchase_price: f64 = row.get(3)?;
        let recipe_unit: String = row.get(4)?;
        let yield_factor: f64 = row.get(5)?;
        let conversion_factor: Option<f64> = row.get(6)?;
        let base_unit_code: Option<String> = row.get(7)?;
        let net_quantity: f64 = row.get(8)?;
        let net_unit: String = row.get(9)?;

        let (nuc, lic, eff_yf) = match (conversion_factor, base_unit_code) {
            (Some(factor), Some(ref base_code)) if factor > 0.0 => {
                let package_base_qty = normalize_to_base_unit(net_quantity, &net_unit, base_code);
                let base_unit_cost = if package_base_qty > 0.0 {
                    purchase_price / package_base_qty
                } else {
                    0.0
                };
                let normalized_recipe_qty = if recipe_unit.trim().eq_ignore_ascii_case(base_code) {
                    batch_qty
                } else {
                    batch_qty * factor
                };
                let cost = normalized_recipe_qty * base_unit_cost;
                let unit_cost = if batch_qty > 0.0 { cost / batch_qty } else { 0.0 };
                let derived_yf = if normalized_recipe_qty > 0.0 {
                    package_base_qty / (normalized_recipe_qty / batch_qty)
                } else {
                    yield_factor
                };
                (unit_cost, cost, derived_yf)
            }
            _ => {
                let cost_per_unit = if yield_factor != 0.0 { purchase_price / yield_factor } else { 0.0 };
                (cost_per_unit, batch_qty * cost_per_unit, yield_factor)
            }
        };

        Ok((name, purchase_unit, purchase_price, recipe_unit, eff_yf, batch_qty, nuc, lic))
    })
    .map_err(|e| e.to_string())?
    .for_each(|r| {
        if let Ok((name, pu, pp, ru, yf, bq, nuc, lic)) = r {
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
            .ok_or_else(|| "Failed to determine database parent directory".to_string())?
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

// ── Perpetual Inventory & LRC Commands ────────────────────────────────────────

#[tauri::command]
pub fn receive_inventory(
    state: State<DbState>,
    payload: ReceiveInventoryPayload,
) -> Result<InventoryLedgerItem, String> {
    if payload.added_qty <= 0.0 {
        return Err("Added quantity must be strictly greater than zero".to_string());
    }
    if payload.new_invoice_price < 0.0 {
        return Err("New invoice price cannot be negative".to_string());
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let rows_affected = conn
        .execute(
            "UPDATE ingredients
             SET current_stock_qty = current_stock_qty + ?1,
                 purchase_price = ?2,
                 updated_at = datetime('now')
             WHERE ingredient_id = ?3",
            params![payload.added_qty, payload.new_invoice_price, payload.ingredient_id],
        )
        .map_err(|e| e.to_string())?;

    if rows_affected == 0 {
        return Err(format!("Ingredient with ID {} not found", payload.ingredient_id));
    }

    let item = conn
        .query_row(
            "SELECT ingredient_id, name, purchase_unit, purchase_price, current_stock_qty, reorder_threshold
             FROM ingredients WHERE ingredient_id = ?1",
            params![payload.ingredient_id],
            |row| {
                let ingredient_id: i64 = row.get(0)?;
                let name: String = row.get(1)?;
                let purchase_unit: String = row.get(2)?;
                let purchase_price: f64 = row.get(3)?;
                let current_stock_qty: f64 = row.get(4)?;
                let reorder_threshold: f64 = row.get(5)?;
                let total_value = current_stock_qty * purchase_price;
                let is_low_stock = current_stock_qty <= reorder_threshold;
                Ok(InventoryLedgerItem {
                    ingredient_id,
                    name,
                    purchase_unit,
                    purchase_price,
                    current_stock_qty,
                    reorder_threshold,
                    total_value,
                    is_low_stock,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(item)
}

#[tauri::command]
pub fn get_inventory_ledger(
    state: State<DbState>,
) -> Result<Vec<InventoryLedgerItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT ingredient_id, name, purchase_unit, purchase_price, current_stock_qty, reorder_threshold
             FROM ingredients
             ORDER BY (CASE WHEN current_stock_qty <= reorder_threshold THEN 0 ELSE 1 END) ASC, name ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map([], |row| {
            let ingredient_id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let purchase_unit: String = row.get(2)?;
            let purchase_price: f64 = row.get(3)?;
            let current_stock_qty: f64 = row.get(4)?;
            let reorder_threshold: f64 = row.get(5)?;
            let total_value = current_stock_qty * purchase_price;
            let is_low_stock = current_stock_qty <= reorder_threshold;
            Ok(InventoryLedgerItem {
                ingredient_id,
                name,
                purchase_unit,
                purchase_price,
                current_stock_qty,
                reorder_threshold,
                total_value,
                is_low_stock,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}

struct RequirementAgg {
    ingredient_id: i64,
    ingredient_name: String,
    purchase_unit: String,
    current_stock_qty: f64,
    total_bulk_required: f64,
}

#[tauri::command]
pub fn produce_batch_with_validation(
    state: State<DbState>,
    payload: ProduceBatchPayload,
) -> Result<ProduceBatchSuccess, ProductionError> {
    if payload.batches <= 0.0 {
        return Err(ProductionError {
            message: "Batches to produce must be greater than zero".to_string(),
            deficits: vec![],
        });
    }

    let mut conn = state.0.lock().map_err(|e| ProductionError {
        message: e.to_string(),
        deficits: vec![],
    })?;

    let recipe_name: String = conn
        .query_row(
            "SELECT name FROM recipes WHERE recipe_id = ?1",
            params![payload.recipe_id],
            |row| row.get(0),
        )
        .map_err(|_| ProductionError {
            message: format!("Recipe with ID {} not found", payload.recipe_id),
            deficits: vec![],
        })?;

    let mut stmt = conn
        .prepare(
            "SELECT ri.ingredient_id, ri.batch_qty,
                    COALESCE(ic.yield_factor, i.yield_factor) AS yield_factor,
                    i.name, i.purchase_unit, i.current_stock_qty,
                    COALESCE(ic.recipe_unit, i.recipe_unit) AS recipe_unit,
                    ic.conversion_factor, bu.code AS base_unit_code,
                    COALESCE(i.net_quantity, 1.0), COALESCE(i.net_unit, 'Kilogram')
             FROM recipe_ingredients ri
             JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
             LEFT JOIN ingredient_conversions ic ON ic.conversion_id = ri.conversion_id
             LEFT JOIN units bu ON bu.unit_id = i.base_unit_id
             WHERE ri.recipe_id = ?1",
        )
        .map_err(|e| ProductionError {
            message: e.to_string(),
            deficits: vec![],
        })?;

    let rows = stmt
        .query_map(params![payload.recipe_id], |row| {
            let ingredient_id: i64 = row.get(0)?;
            let batch_qty: f64 = row.get(1)?;
            let yield_factor: f64 = row.get(2)?;
            let name: String = row.get(3)?;
            let purchase_unit: String = row.get(4)?;
            let current_stock_qty: f64 = row.get(5)?;
            let recipe_unit: String = row.get(6)?;
            let conversion_factor: Option<f64> = row.get(7)?;
            let base_unit_code: Option<String> = row.get(8)?;
            let net_quantity: f64 = row.get(9)?;
            let net_unit: String = row.get(10)?;
            Ok((
                ingredient_id,
                batch_qty,
                yield_factor,
                name,
                purchase_unit,
                current_stock_qty,
                recipe_unit,
                conversion_factor,
                base_unit_code,
                net_quantity,
                net_unit,
            ))
        })
        .map_err(|e| ProductionError {
            message: e.to_string(),
            deficits: vec![],
        })?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| ProductionError {
            message: e.to_string(),
            deficits: vec![],
        })?;

    drop(stmt);

    if rows.is_empty() {
        return Err(ProductionError {
            message: format!("Recipe '{}' has no ingredients configured", recipe_name),
            deficits: vec![],
        });
    }

    // Pre-flight conversion & multi-occurrence aggregation
    let mut req_map: std::collections::BTreeMap<i64, RequirementAgg> = std::collections::BTreeMap::new();
    for (
        ingredient_id,
        batch_qty,
        yield_factor,
        name,
        purchase_unit,
        current_stock_qty,
        recipe_unit,
        conversion_factor,
        base_unit_code,
        net_quantity,
        net_unit,
    ) in rows
    {
        let bulk_needed = match (conversion_factor, base_unit_code) {
            (Some(factor), Some(ref base_code)) if factor > 0.0 => {
                let package_base_qty = normalize_to_base_unit(net_quantity, &net_unit, base_code);
                let normalized_recipe_qty = if recipe_unit.trim().eq_ignore_ascii_case(base_code) {
                    batch_qty
                } else {
                    batch_qty * factor
                };
                if package_base_qty > 0.0 {
                    (normalized_recipe_qty * payload.batches) / package_base_qty
                } else {
                    0.0
                }
            }
            _ => {
                if yield_factor > 0.0 {
                    (batch_qty * payload.batches) / yield_factor
                } else {
                    0.0
                }
            }
        };

        let entry = req_map.entry(ingredient_id).or_insert_with(|| RequirementAgg {
            ingredient_id,
            ingredient_name: name,
            purchase_unit,
            current_stock_qty,
            total_bulk_required: 0.0,
        });
        entry.total_bulk_required += bulk_needed;
    }

    // ── Fetch packaging requirements for recipe ─────────────────────────────
    let mut pkg_stmt = conn
        .prepare(
            "SELECT rp.packaging_id, rp.batch_qty, p.name, p.unit, p.current_stock_qty, p.current_unit_cost
             FROM recipe_packaging rp
             JOIN packaging p ON p.packaging_id = rp.packaging_id
             WHERE rp.recipe_id = ?1",
        )
        .map_err(|e| ProductionError {
            message: e.to_string(),
            deficits: vec![],
        })?;

    struct PkgReq {
        packaging_id: i64,
        name: String,
        unit: String,
        required_qty: f64,
        current_stock: f64,
        unit_cost: f64,
    }

    let pkg_rows = pkg_stmt
        .query_map(params![payload.recipe_id], |row| {
            let packaging_id: i64 = row.get(0)?;
            let batch_qty: f64 = row.get(1)?;
            let name: String = row.get(2)?;
            let unit: String = row.get(3)?;
            let current_stock: f64 = row.get(4)?;
            let unit_cost: f64 = row.get(5)?;
            let required_qty = batch_qty * payload.batches;
            Ok(PkgReq {
                packaging_id,
                name,
                unit,
                required_qty,
                current_stock,
                unit_cost,
            })
        })
        .map_err(|e| ProductionError {
            message: e.to_string(),
            deficits: vec![],
        })?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| ProductionError {
            message: e.to_string(),
            deficits: vec![],
        })?;
    drop(pkg_stmt);

    // Validation Check (Hard Stop for both Ingredients and Packaging)
    let mut deficits: Vec<StockDeficit> = Vec::new();
    for agg in req_map.values() {
        if agg.total_bulk_required > agg.current_stock_qty {
            let deficit_qty = agg.total_bulk_required - agg.current_stock_qty;
            deficits.push(StockDeficit {
                ingredient_name: agg.ingredient_name.clone(),
                required_bulk_qty: agg.total_bulk_required,
                current_bulk_qty: agg.current_stock_qty,
                deficit_qty,
                unit: agg.purchase_unit.clone(),
                item_type: "ingredient".to_string(),
            });
        }
    }

    for pkg in &pkg_rows {
        if pkg.required_qty > pkg.current_stock {
            let deficit_qty = pkg.required_qty - pkg.current_stock;
            deficits.push(StockDeficit {
                ingredient_name: pkg.name.clone(),
                required_bulk_qty: pkg.required_qty,
                current_bulk_qty: pkg.current_stock,
                deficit_qty,
                unit: pkg.unit.clone(),
                item_type: "packaging".to_string(),
            });
        }
    }

    if !deficits.is_empty() {
        // Path 1 (Deficit): Transaction aborts without any modification
        return Err(ProductionError {
            message: format!(
                "Insufficient stock to produce {} batch(es) of '{}'. {} item(s) in deficit.",
                payload.batches,
                recipe_name,
                deficits.len()
            ),
            deficits,
        });
    }

    // Path 2 (Sufficient): Execute deduction in atomic transaction
    let tx = conn.transaction().map_err(|e| ProductionError {
        message: e.to_string(),
        deficits: vec![],
    })?;

    for agg in req_map.values() {
        tx.execute(
            "UPDATE ingredients
             SET current_stock_qty = current_stock_qty - ?1,
                 updated_at = datetime('now')
             WHERE ingredient_id = ?2",
            params![agg.total_bulk_required, agg.ingredient_id],
        )
        .map_err(|e| ProductionError {
            message: e.to_string(),
            deficits: vec![],
        })?;
    }

    for pkg in &pkg_rows {
        tx.execute(
            "UPDATE packaging
             SET current_stock_qty = current_stock_qty - ?1,
                 updated_at = datetime('now')
             WHERE packaging_id = ?2",
            params![pkg.required_qty, pkg.packaging_id],
        )
        .map_err(|e| ProductionError {
            message: e.to_string(),
            deficits: vec![],
        })?;

        tx.execute(
            "INSERT INTO packaging_transactions (packaging_id, transaction_type, quantity, unit_cost, reference)
             VALUES (?1, 'OUT', ?2, ?3, ?4)",
            params![
                pkg.packaging_id,
                pkg.required_qty,
                pkg.unit_cost,
                format!("Production: {} ({} batch(es))", recipe_name, payload.batches)
            ],
        )
        .map_err(|e| ProductionError {
            message: e.to_string(),
            deficits: vec![],
        })?;
    }

    tx.commit().map_err(|e| ProductionError {
        message: e.to_string(),
        deficits: vec![],
    })?;

    Ok(ProduceBatchSuccess {
        recipe_id: payload.recipe_id,
        recipe_name,
        batches_produced: payload.batches,
        timestamp: chrono::Local::now().to_rfc3339(),
    })
}

// ── Packaging Commands (v2.1) ────────────────────────────────────────────────

#[tauri::command]
pub fn get_packaging_list(state: State<DbState>) -> Result<Vec<Packaging>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT packaging_id, packaging_code, name, packaging_type, unit,
                    current_unit_cost, current_stock_qty, reorder_threshold, is_active,
                    created_at, updated_at
             FROM packaging
             ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map([], |row| {
            Ok(Packaging {
                packaging_id: row.get(0)?,
                packaging_code: row.get(1)?,
                name: row.get(2)?,
                packaging_type: row.get(3)?,
                unit: row.get(4)?,
                current_unit_cost: row.get(5)?,
                current_stock_qty: row.get(6)?,
                reorder_threshold: row.get(7)?,
                is_active: row.get::<_, i32>(8)? == 1,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub fn create_packaging(
    state: State<DbState>,
    input: PackagingInput,
) -> Result<Packaging, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let is_active_int = if input.is_active { 1 } else { 0 };

    conn.execute(
        "INSERT INTO packaging (packaging_code, name, packaging_type, unit, current_unit_cost, current_stock_qty, reorder_threshold, is_active)
         VALUES (?1, ?2, ?3, ?4, ?5, 0.0, ?6, ?7)",
        params![
            input.packaging_code,
            input.name,
            input.packaging_type,
            input.unit,
            input.current_unit_cost,
            input.reorder_threshold,
            is_active_int
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(Packaging {
        packaging_id: id,
        packaging_code: input.packaging_code,
        name: input.name,
        packaging_type: input.packaging_type,
        unit: input.unit,
        current_unit_cost: input.current_unit_cost,
        current_stock_qty: 0.0,
        reorder_threshold: input.reorder_threshold,
        is_active: input.is_active,
        created_at: chrono::Local::now().to_rfc3339(),
        updated_at: chrono::Local::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn update_packaging(
    state: State<DbState>,
    packaging_id: i64,
    input: PackagingInput,
) -> Result<Packaging, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let is_active_int = if input.is_active { 1 } else { 0 };

    conn.execute(
        "UPDATE packaging
         SET packaging_code = ?1, name = ?2, packaging_type = ?3, unit = ?4,
             current_unit_cost = ?5, reorder_threshold = ?6, is_active = ?7,
             updated_at = datetime('now')
         WHERE packaging_id = ?8",
        params![
            input.packaging_code,
            input.name,
            input.packaging_type,
            input.unit,
            input.current_unit_cost,
            input.reorder_threshold,
            is_active_int,
            packaging_id
        ],
    )
    .map_err(|e| e.to_string())?;

    let current_stock_qty: f64 = conn
        .query_row(
            "SELECT current_stock_qty FROM packaging WHERE packaging_id = ?1",
            params![packaging_id],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    Ok(Packaging {
        packaging_id,
        packaging_code: input.packaging_code,
        name: input.name,
        packaging_type: input.packaging_type,
        unit: input.unit,
        current_unit_cost: input.current_unit_cost,
        current_stock_qty,
        reorder_threshold: input.reorder_threshold,
        is_active: input.is_active,
        created_at: chrono::Local::now().to_rfc3339(),
        updated_at: chrono::Local::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn toggle_packaging_active(
    state: State<DbState>,
    packaging_id: i64,
    is_active: bool,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let flag = if is_active { 1 } else { 0 };
    conn.execute(
        "UPDATE packaging SET is_active = ?1, updated_at = datetime('now') WHERE packaging_id = ?2",
        params![flag, packaging_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_recipe_packaging(
    state: State<DbState>,
    recipe_id: i64,
) -> Result<Vec<RecipePackaging>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT rp.id, rp.recipe_id, rp.packaging_id, rp.batch_qty,
                    p.packaging_code, p.name, p.packaging_type, p.unit, p.current_unit_cost
             FROM recipe_packaging rp
             JOIN packaging p ON p.packaging_id = rp.packaging_id
             WHERE rp.recipe_id = ?1
             ORDER BY p.name ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![recipe_id], |row| {
            let id: i64 = row.get(0)?;
            let recipe_id: i64 = row.get(1)?;
            let packaging_id: i64 = row.get(2)?;
            let batch_qty: f64 = row.get(3)?;
            let packaging_code: String = row.get(4)?;
            let packaging_name: String = row.get(5)?;
            let packaging_type: String = row.get(6)?;
            let unit: String = row.get(7)?;
            let current_unit_cost: f64 = row.get(8)?;
            let line_item_cost = batch_qty * current_unit_cost;

            Ok(RecipePackaging {
                id,
                recipe_id,
                packaging_id,
                batch_qty,
                packaging_code,
                packaging_name,
                packaging_type,
                unit,
                current_unit_cost,
                line_item_cost,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub fn upsert_recipe_packaging(
    state: State<DbState>,
    input: RecipePackagingInput,
) -> Result<RecipePackaging, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(id) = input.id {
        conn.execute(
            "UPDATE recipe_packaging SET packaging_id = ?1, batch_qty = ?2 WHERE id = ?3",
            params![input.packaging_id, input.batch_qty, id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO recipe_packaging (recipe_id, packaging_id, batch_qty)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(recipe_id, packaging_id) DO UPDATE SET batch_qty = excluded.batch_qty",
            params![input.recipe_id, input.packaging_id, input.batch_qty],
        )
        .map_err(|e| e.to_string())?;
    }

    let (id, code, name, ptype, unit, cost): (i64, String, String, String, String, f64) = conn
        .query_row(
            "SELECT rp.id, p.packaging_code, p.name, p.packaging_type, p.unit, p.current_unit_cost
             FROM recipe_packaging rp
             JOIN packaging p ON p.packaging_id = rp.packaging_id
             WHERE rp.recipe_id = ?1 AND rp.packaging_id = ?2",
            params![input.recipe_id, input.packaging_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?)),
        )
        .map_err(|e| e.to_string())?;

    let line_item_cost = input.batch_qty * cost;

    Ok(RecipePackaging {
        id,
        recipe_id: input.recipe_id,
        packaging_id: input.packaging_id,
        batch_qty: input.batch_qty,
        packaging_code: code,
        packaging_name: name,
        packaging_type: ptype,
        unit,
        current_unit_cost: cost,
        line_item_cost,
    })
}

#[tauri::command]
pub fn remove_recipe_packaging(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM recipe_packaging WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn receive_packaging_inventory(
    state: State<DbState>,
    payload: ReceivePackagingPayload,
) -> Result<(), String> {
    if payload.added_qty <= 0.0 {
        return Err("Received quantity must be greater than zero".to_string());
    }
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    if payload.new_unit_cost > 0.0 {
        tx.execute(
            "UPDATE packaging
             SET current_stock_qty = current_stock_qty + ?1,
                 current_unit_cost = ?2,
                 updated_at = datetime('now')
             WHERE packaging_id = ?3",
            params![payload.added_qty, payload.new_unit_cost, payload.packaging_id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        tx.execute(
            "UPDATE packaging
             SET current_stock_qty = current_stock_qty + ?1,
                 updated_at = datetime('now')
             WHERE packaging_id = ?2",
            params![payload.added_qty, payload.packaging_id],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.execute(
        "INSERT INTO packaging_transactions (packaging_id, transaction_type, quantity, unit_cost, reference)
         VALUES (?1, 'IN', ?2, ?3, 'Stock Receipt')",
        params![payload.packaging_id, payload.added_qty, payload.new_unit_cost],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_packaging_inventory_ledger(
    state: State<DbState>,
) -> Result<Vec<PackagingLedgerItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT packaging_id, packaging_code, name, packaging_type, unit,
                    current_unit_cost, current_stock_qty, reorder_threshold
             FROM packaging
             WHERE is_active = 1
             ORDER BY (CASE WHEN current_stock_qty <= reorder_threshold THEN 0 ELSE 1 END) ASC, name ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map([], |row| {
            let packaging_id: i64 = row.get(0)?;
            let packaging_code: String = row.get(1)?;
            let name: String = row.get(2)?;
            let packaging_type: String = row.get(3)?;
            let unit: String = row.get(4)?;
            let current_unit_cost: f64 = row.get(5)?;
            let current_stock_qty: f64 = row.get(6)?;
            let reorder_threshold: f64 = row.get(7)?;
            let total_value = current_stock_qty * current_unit_cost;
            let is_low_stock = current_stock_qty <= reorder_threshold;

            Ok(PackagingLedgerItem {
                packaging_id,
                packaging_code,
                name,
                packaging_type,
                unit,
                current_unit_cost,
                current_stock_qty,
                reorder_threshold,
                total_value,
                is_low_stock,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub fn get_packaging_transactions(
    state: State<DbState>,
    packaging_id: Option<i64>,
) -> Result<Vec<PackagingTransaction>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let sql = if packaging_id.is_some() {
        "SELECT transaction_id, packaging_id, transaction_type, quantity, unit_cost, reference, created_at
         FROM packaging_transactions
         WHERE packaging_id = ?1
         ORDER BY transaction_id DESC"
    } else {
        "SELECT transaction_id, packaging_id, transaction_type, quantity, unit_cost, reference, created_at
         FROM packaging_transactions
         ORDER BY transaction_id DESC"
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let map_fn = |row: &rusqlite::Row| {
        Ok(PackagingTransaction {
            transaction_id: row.get(0)?,
            packaging_id: row.get(1)?,
            transaction_type: row.get(2)?,
            quantity: row.get(3)?,
            unit_cost: row.get(4)?,
            reference: row.get(5)?,
            created_at: row.get(6)?,
        })
    };

    let items = if let Some(pid) = packaging_id {
        stmt.query_map(params![pid], map_fn)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    } else {
        stmt.query_map([], map_fn)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };

    Ok(items)
}
