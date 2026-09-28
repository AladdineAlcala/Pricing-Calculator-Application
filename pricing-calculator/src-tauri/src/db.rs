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

pub fn initialize_database(conn: &Connection, db_path: &std::path::Path) -> Result<()> {
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
            package_type    TEXT    NOT NULL DEFAULT 'Package',
            net_quantity    REAL    NOT NULL DEFAULT 1.0,
            net_unit        TEXT    NOT NULL DEFAULT 'Kilogram',
            created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
        );",
    )?;

    // Safe backward-compatible migrations for existing SQLite databases
    let _ = conn.execute(
        "ALTER TABLE ingredients ADD COLUMN package_type TEXT NOT NULL DEFAULT 'Package'",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE ingredients ADD COLUMN net_quantity REAL NOT NULL DEFAULT 1.0",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE ingredients ADD COLUMN net_unit TEXT NOT NULL DEFAULT 'Kilogram'",
        [],
    );

    // ── 2. ingredient_conversions (Multi-Unit Architecture) ─────────────────
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS ingredient_conversions (
            conversion_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            ingredient_id   INTEGER NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
            recipe_unit     TEXT    NOT NULL,
            yield_factor    REAL    NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_ingredient_conversions_ing
            ON ingredient_conversions(ingredient_id);",
    )?;

    // ── 3. recipes ───────────────────────────────────────────────────────────
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

    // ── 4. recipe_ingredients ────────────────────────────────────────────────
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS recipe_ingredients (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            recipe_id       INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
            ingredient_id   INTEGER NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
            conversion_id   INTEGER REFERENCES ingredient_conversions(conversion_id) ON DELETE SET NULL,
            batch_qty       REAL    NOT NULL DEFAULT 0.0,
            UNIQUE(recipe_id, ingredient_id, conversion_id)
        );
        DROP INDEX IF EXISTS idx_recipe_ingredients_unique;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_ingredients_multi_unit
            ON recipe_ingredients(recipe_id, ingredient_id, conversion_id);",
    )?;

    // Safe migration: rebuild recipe_ingredients table if it has the old UNIQUE(recipe_id, ingredient_id) constraint
    let needs_rebuild: bool = conn
        .query_row(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='recipe_ingredients'",
            [],
            |row| row.get::<_, String>(0),
        )
        .map(|sql| sql.contains("UNIQUE(recipe_id, ingredient_id)") && !sql.contains("UNIQUE(recipe_id, ingredient_id, conversion_id)"))
        .unwrap_or(false);

    if needs_rebuild {
        let _ = conn.execute_batch(
            "DROP INDEX IF EXISTS idx_recipe_ingredients_unique;
             CREATE TABLE IF NOT EXISTS recipe_ingredients_v2 (
                 id              INTEGER PRIMARY KEY AUTOINCREMENT,
                 recipe_id       INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
                 ingredient_id   INTEGER NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
                 conversion_id   INTEGER REFERENCES ingredient_conversions(conversion_id) ON DELETE SET NULL,
                 batch_qty       REAL    NOT NULL DEFAULT 0.0,
                 UNIQUE(recipe_id, ingredient_id, conversion_id)
             );
             INSERT OR IGNORE INTO recipe_ingredients_v2 (id, recipe_id, ingredient_id, conversion_id, batch_qty)
                 SELECT id, recipe_id, ingredient_id, conversion_id, batch_qty FROM recipe_ingredients;
             DROP TABLE recipe_ingredients;
             ALTER TABLE recipe_ingredients_v2 RENAME TO recipe_ingredients;
             CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
             CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_ingredients_multi_unit ON recipe_ingredients(recipe_id, ingredient_id, conversion_id);"
        );
    }

    // Safe migration: add conversion_id column if table already existed without it
    let _ = conn.execute(
        "ALTER TABLE recipe_ingredients ADD COLUMN conversion_id INTEGER REFERENCES ingredient_conversions(conversion_id) ON DELETE SET NULL",
        [],
    );

    // Auto-populate default conversion for any ingredient without conversions
    let _ = conn.execute_batch(
        "INSERT INTO ingredient_conversions (ingredient_id, recipe_unit, yield_factor)
         SELECT ingredient_id, recipe_unit, yield_factor
         FROM ingredients i
         WHERE NOT EXISTS (
             SELECT 1 FROM ingredient_conversions ic WHERE ic.ingredient_id = i.ingredient_id
         );

         UPDATE recipe_ingredients
         SET conversion_id = (
             SELECT conversion_id FROM ingredient_conversions ic
             WHERE ic.ingredient_id = recipe_ingredients.ingredient_id
             LIMIT 1
         )
         WHERE conversion_id IS NULL;",
    );

    // ── 5. app_settings ──────────────────────────────────────────────────────
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

    // ── Check & migrate legacy databases (e.g. from com.pricingcalculator.app) ──
    check_and_migrate_legacy_db(conn, db_path)?;

    // ── Seed UOM ingredients ─────────────────────────────────────────────────
    seed_ingredients(conn)?;

    Ok(())
}

fn check_and_migrate_legacy_db(conn: &Connection, db_path: &std::path::Path) -> Result<()> {
    let existing_recipes: i64 = conn
        .query_row("SELECT COUNT(*) FROM recipes", [], |row| row.get(0))
        .unwrap_or(0);

    if existing_recipes > 0 {
        return Ok(());
    }

    if let Some(parent) = db_path.parent() {
        if let Some(roaming) = parent.parent() {
            let legacy_dirs = [
                roaming.join("com.pricingcalculator.app").join("pricing_calculator.db"),
                roaming.join("com.pricing-calculator.app").join("pricing_calculator.db"),
                roaming.join("pricing-calculator").join("pricing_calculator.db"),
            ];

            for legacy_path in &legacy_dirs {
                if legacy_path.exists() && legacy_path != db_path {
                    let escaped_path = legacy_path.to_string_lossy().replace('\'', "''");
                    let attach_sql = format!("ATTACH DATABASE '{}' AS legacy;", escaped_path);
                    if conn.execute_batch(&attach_sql).is_ok() {
                        let legacy_recipes: i64 = conn
                            .query_row("SELECT COUNT(*) FROM legacy.recipes", [], |row| row.get(0))
                            .unwrap_or(0);

                        if legacy_recipes > 0 {
                            let _ = conn.execute_batch(
                                "INSERT OR REPLACE INTO ingredients (ingredient_id, name, purchase_unit, purchase_price, recipe_unit, yield_factor, package_type, net_quantity, net_unit, created_at, updated_at)
                                 SELECT ingredient_id, name, purchase_unit, purchase_price, recipe_unit, yield_factor, package_type, net_quantity, net_unit, created_at, updated_at FROM legacy.ingredients;

                                 INSERT OR REPLACE INTO recipes (recipe_id, name, yield_qty, labor_cost, electricity_cost, other_overhead, target_markup_pct, reseller_markup_pct, desired_profit_alert, created_at, updated_at)
                                 SELECT recipe_id, name, yield_qty, labor_cost, electricity_cost, other_overhead, target_markup_pct, reseller_markup_pct, desired_profit_alert, created_at, updated_at FROM legacy.recipes;

                                 INSERT OR REPLACE INTO recipe_ingredients (id, recipe_id, ingredient_id, batch_qty)
                                 SELECT id, recipe_id, ingredient_id, batch_qty FROM legacy.recipe_ingredients;

                                 INSERT OR IGNORE INTO app_settings (setting_key, setting_value)
                                 SELECT setting_key, setting_value FROM legacy.app_settings;"
                            );
                        }
                        let _ = conn.execute_batch("DETACH DATABASE legacy;");
                        if legacy_recipes > 0 {
                            break;
                        }
                    }
                }
            }
        }
    }

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

    let seeds: Vec<(&str, &str, f64, &str, f64, &str, f64, &str)> = vec![
        ("All-Purpose Flour",    "Bag (1 kg)",      0.0, "Cup",  8.33,  "Bag",       1.0,   "Kilogram"),
        ("Granulated Sugar",     "Bag (1 kg)",      0.0, "Cup",  5.00,  "Bag",       1.0,   "Kilogram"),
        ("Brown Sugar (Packed)", "Bag (1 kg)",      0.0, "Cup",  4.69,  "Bag",       1.0,   "Kilogram"),
        ("Cocoa Powder",         "Can (1 kg)",      0.0, "Cup", 10.00,  "Can",       1.0,   "Kilogram"),
        ("Unsalted Butter",      "Box (225 g)",     0.0, "Cup",  0.99,  "Box",     225.0,   "g"),
        ("Vegetable Oil",        "Bottle (1 L)",    0.0, "Cup",  4.17,  "Bottle",    1.0,   "Liter"),
        ("Whole Milk",           "Carton (1 L)",    0.0, "Cup",  4.17,  "Carton",    1.0,   "Liter"),
        ("Baking Powder",        "Container (100g)",0.0, "tsp", 20.00,  "Container", 100.0,  "g"),
        ("Baking Soda",          "Container (100g)",0.0, "tsp", 20.00,  "Container", 100.0,  "g"),
        ("Vanilla Extract",      "Bottle (100ml)",  0.0, "tsp", 20.00,  "Bottle",    100.0,  "ml"),
        ("Large Eggs",           "Tray (12 pcs)",   0.0, "pcs", 12.00,  "Tray",       12.0,  "pcs"),
    ];

    for (name, purchase_unit, purchase_price, recipe_unit, yield_factor, package_type, net_quantity, net_unit) in seeds {
        conn.execute(
            "INSERT INTO ingredients (name, purchase_unit, purchase_price, recipe_unit, yield_factor, package_type, net_quantity, net_unit)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![name, purchase_unit, purchase_price, recipe_unit, yield_factor, package_type, net_quantity, net_unit],
        )?;
        let ing_id = conn.last_insert_rowid();

        // Primary conversion rule
        let _ = conn.execute(
            "INSERT INTO ingredient_conversions (ingredient_id, recipe_unit, yield_factor) VALUES (?1, ?2, ?3)",
            params![ing_id, recipe_unit, yield_factor],
        );

        // Culinary multi-unit variations matching ApplicationDesignDocument
        if name.contains("Sugar") {
            let _ = conn.execute(
                "INSERT INTO ingredient_conversions (ingredient_id, recipe_unit, yield_factor) VALUES (?1, 'Gram', 1000.0), (?1, 'Tablespoon', 80.0)",
                params![ing_id],
            );
        } else if name.contains("Flour") {
            let _ = conn.execute(
                "INSERT INTO ingredient_conversions (ingredient_id, recipe_unit, yield_factor) VALUES (?1, 'Gram', 1000.0), (?1, 'Tablespoon', 125.0)",
                params![ing_id],
            );
        } else if name.contains("Butter") {
            let _ = conn.execute(
                "INSERT INTO ingredient_conversions (ingredient_id, recipe_unit, yield_factor) VALUES (?1, 'Gram', 225.0), (?1, 'Stick', 2.0)",
                params![ing_id],
            );
        } else if name.contains("Milk") {
            let _ = conn.execute(
                "INSERT INTO ingredient_conversions (ingredient_id, recipe_unit, yield_factor) VALUES (?1, 'ml', 1000.0), (?1, 'Tablespoon', 66.67)",
                params![ing_id],
            );
        }
    }

    Ok(())
}
