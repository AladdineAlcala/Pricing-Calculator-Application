// Database initialization and migration module
use rusqlite::{Connection, Result, params};
use std::path::PathBuf;
use tauri::Manager;

pub fn get_db_path(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory")
        .join("pricing_calculator.db")
}

pub fn initialize_database(conn: &Connection) -> Result<()> {
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;

    // ── 1. ingredients ──────────────────────────────────────────────────────
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS ingredients (
            ingredient_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT    NOT NULL,
            purchase_unit   TEXT    NOT NULL,
            purchase_price  REAL    NOT NULL DEFAULT 0.0,
            recipe_unit     TEXT    NOT NULL,
            yield_factor    REAL    NOT NULL,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
        );",
    )?;

    // ── 2. recipes ───────────────────────────────────────────────────────────
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS recipes (
            recipe_id           INTEGER PRIMARY KEY AUTOINCREMENT,
            name                TEXT    NOT NULL,
            yield_qty           REAL    NOT NULL DEFAULT 1.0,
            labor_cost          REAL    NOT NULL DEFAULT 0.0,
            electricity_cost    REAL    NOT NULL DEFAULT 0.0,
            other_overhead      REAL    NOT NULL DEFAULT 0.0,
            target_markup_pct   REAL    NOT NULL DEFAULT 0.5,
            reseller_markup_pct REAL    NOT NULL DEFAULT 0.2,
            desired_profit_alert REAL   NOT NULL DEFAULT 0.0,
            created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
        );",
    )?;

    // ── 3. recipe_ingredients ────────────────────────────────────────────────
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS recipe_ingredients (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            recipe_id       INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
            ingredient_id   INTEGER NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
            batch_qty       REAL    NOT NULL DEFAULT 0.0,
            UNIQUE(recipe_id, ingredient_id)
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_ingredients_unique
            ON recipe_ingredients(recipe_id, ingredient_id);",
    )?;

    // ── 4. app_settings ──────────────────────────────────────────────────────
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS app_settings (
            setting_key     TEXT PRIMARY KEY,
            setting_value   TEXT NOT NULL
        );",
    )?;

    // Default settings
    conn.execute_batch(
        "INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES
            ('theme', 'light'),
            ('auto_backup_enabled', 'true'),
            ('backup_path', ''),
            ('currency_symbol', '₱'),
            ('last_backup', '');",
    )?;

    // ── Seed UOM ingredients ─────────────────────────────────────────────────
    seed_ingredients(conn)?;

    Ok(())
}

fn seed_ingredients(conn: &Connection) -> Result<()> {
    let existing: i64 = conn.query_row(
        "SELECT COUNT(*) FROM ingredients",
        [],
        |row| row.get(0),
    )?;

    if existing > 0 {
        return Ok(()); // already seeded
    }

    let seeds: Vec<(&str, &str, f64, &str, f64)> = vec![
        ("All-Purpose Flour",   "Kilogram",      0.0, "Cup",  8.33),
        ("Granulated Sugar",    "Kilogram",      0.0, "Cup",  5.00),
        ("Brown Sugar (Packed)","Kilogram",      0.0, "Cup",  4.69),
        ("Cocoa Powder",        "Kilogram",      0.0, "Cup", 10.00),
        ("Unsalted Butter",     "Kilogram",      0.0, "Cup",  4.41),
        ("Vegetable Oil",       "Liter",         0.0, "Cup",  4.17),
        ("Whole Milk",          "Liter",         0.0, "Cup",  4.17),
        ("Baking Powder",       "100g Container",0.0, "tsp", 20.00),
        ("Baking Soda",         "100g Container",0.0, "tsp", 20.00),
        ("Vanilla Extract",     "100ml Bottle",  0.0, "tsp", 20.00),
        ("Large Eggs",          "Dozen",         0.0, "pcs", 12.00),
    ];

    for (name, purchase_unit, purchase_price, recipe_unit, yield_factor) in seeds {
        conn.execute(
            "INSERT INTO ingredients (name, purchase_unit, purchase_price, recipe_unit, yield_factor)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![name, purchase_unit, purchase_price, recipe_unit, yield_factor],
        )?;
    }

    Ok(())
}
