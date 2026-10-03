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

    // ── 0. units (Centralized Unit System — Fixed Seed) ──────────────────────
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS units (
            unit_id     INTEGER PRIMARY KEY AUTOINCREMENT,
            code        TEXT    NOT NULL UNIQUE,
            name        TEXT    NOT NULL,
            unit_type   TEXT    NOT NULL,
            is_base     INTEGER NOT NULL DEFAULT 0
        );",
    )?;

    seed_units(conn)?;

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
            current_stock_qty REAL  NOT NULL DEFAULT 0.0,
            reorder_threshold REAL  NOT NULL DEFAULT 0.0,
            supplier        TEXT,
            sku             TEXT,
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
    let _ = conn.execute(
        "ALTER TABLE ingredients ADD COLUMN current_stock_qty REAL NOT NULL DEFAULT 0.0",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE ingredients ADD COLUMN reorder_threshold REAL NOT NULL DEFAULT 0.0",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE ingredients ADD COLUMN supplier TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE ingredients ADD COLUMN sku TEXT",
        [],
    );
    // v2.0: Base-unit conversion engine columns
    let _ = conn.execute(
        "ALTER TABLE ingredients ADD COLUMN base_unit_id INTEGER REFERENCES units(unit_id)",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE ingredients ADD COLUMN category TEXT",
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

    // v2.0: Conversion engine columns on ingredient_conversions
    let _ = conn.execute(
        "ALTER TABLE ingredient_conversions ADD COLUMN from_unit_id INTEGER REFERENCES units(unit_id)",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE ingredient_conversions ADD COLUMN to_unit_id INTEGER REFERENCES units(unit_id)",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE ingredient_conversions ADD COLUMN conversion_factor REAL",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE ingredient_conversions ADD COLUMN source TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE ingredient_conversions ADD COLUMN effective_date TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE ingredient_conversions ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
        [],
    );

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

    // ── 6. ingredient_purchases (v2.0 — Separate Purchase Entity) ────────────
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS ingredient_purchases (
            purchase_id       INTEGER PRIMARY KEY AUTOINCREMENT,
            ingredient_id     INTEGER NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
            supplier_name     TEXT,
            package_quantity  REAL    NOT NULL,
            package_unit_id   INTEGER NOT NULL REFERENCES units(unit_id),
            purchase_price    REAL    NOT NULL,
            purchase_date     TEXT    NOT NULL DEFAULT (datetime('now')),
            is_active         INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_ingredient_purchases_ing
            ON ingredient_purchases(ingredient_id, is_active);",
    )?;

    // v2.0: Add unit_id to recipe_ingredients for base-unit recipe tracking
    let _ = conn.execute(
        "ALTER TABLE recipe_ingredients ADD COLUMN unit_id INTEGER REFERENCES units(unit_id)",
        [],
    );

    // ── v2.0: Auto-populate base_unit_id for existing ingredients ────────────
    let _ = conn.execute_batch(
        "UPDATE ingredients SET base_unit_id = (SELECT unit_id FROM units WHERE code='g')
         WHERE base_unit_id IS NULL AND (
             net_unit IN ('g', 'Kilogram', 'kg') OR
             name LIKE '%Flour%' OR name LIKE '%Sugar%' OR
             name LIKE '%Butter%' OR name LIKE '%Powder%' OR name LIKE '%Soda%'
         );

         UPDATE ingredients SET base_unit_id = (SELECT unit_id FROM units WHERE code='ml')
         WHERE base_unit_id IS NULL AND (
             net_unit IN ('ml', 'Liter', 'L') OR
             name LIKE '%Milk%' OR name LIKE '%Cream%' OR
             name LIKE '%Oil%' OR name LIKE '%Extract%' OR name LIKE '%Vanilla%'
         );

         UPDATE ingredients SET base_unit_id = (SELECT unit_id FROM units WHERE code='pcs')
         WHERE base_unit_id IS NULL AND (
             net_unit IN ('pcs') OR name LIKE '%Egg%'
         );",
    );

    // ── v2.0: Auto-migrate purchase data to ingredient_purchases ─────────────
    let _ = conn.execute_batch(
        "INSERT OR IGNORE INTO ingredient_purchases (ingredient_id, supplier_name, package_quantity, package_unit_id, purchase_price, is_active)
         SELECT
             i.ingredient_id,
             i.supplier,
             i.net_quantity,
             COALESCE(
                 (SELECT u.unit_id FROM units u WHERE
                     (i.net_unit = 'Kilogram' AND u.code = 'kg') OR
                     (i.net_unit = 'g' AND u.code = 'g') OR
                     (i.net_unit = 'Liter' AND u.code = 'L') OR
                     (i.net_unit = 'L' AND u.code = 'L') OR
                     (i.net_unit = 'ml' AND u.code = 'ml') OR
                     (i.net_unit = 'pcs' AND u.code = 'pcs')
                 LIMIT 1),
                 (SELECT unit_id FROM units WHERE code = 'kg')
             ),
             i.purchase_price,
             1
         FROM ingredients i
         WHERE i.purchase_price > 0
           AND NOT EXISTS (
               SELECT 1 FROM ingredient_purchases ip WHERE ip.ingredient_id = i.ingredient_id
           );",
    );

    // ── v2.0: Auto-populate conversion_factor from USDA reference data ───────
    populate_usda_conversion_factors(conn);

    // ── 7. packaging (v2.1: Packaging Management Subsystem) ─────────────────
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS packaging (
            packaging_id        INTEGER PRIMARY KEY AUTOINCREMENT,
            packaging_code      TEXT    NOT NULL UNIQUE,
            name                TEXT    NOT NULL,
            packaging_type      TEXT    NOT NULL,
            unit                TEXT    NOT NULL,
            current_unit_cost   REAL    NOT NULL DEFAULT 0.0,
            current_stock_qty   REAL    NOT NULL DEFAULT 0.0,
            reorder_threshold   REAL    NOT NULL DEFAULT 0.0,
            is_active           INTEGER NOT NULL DEFAULT 1,
            created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_packaging_active ON packaging(is_active);
        CREATE INDEX IF NOT EXISTS idx_packaging_code ON packaging(packaging_code);

        CREATE TABLE IF NOT EXISTS recipe_packaging (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            recipe_id           INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
            packaging_id        INTEGER NOT NULL REFERENCES packaging(packaging_id) ON DELETE RESTRICT,
            batch_qty           REAL    NOT NULL DEFAULT 0.0,
            UNIQUE(recipe_id, packaging_id)
        );
        CREATE INDEX IF NOT EXISTS idx_recipe_packaging_recipe ON recipe_packaging(recipe_id);
        CREATE INDEX IF NOT EXISTS idx_recipe_packaging_pkg ON recipe_packaging(packaging_id);

        CREATE TABLE IF NOT EXISTS packaging_transactions (
            transaction_id      INTEGER PRIMARY KEY AUTOINCREMENT,
            packaging_id        INTEGER NOT NULL REFERENCES packaging(packaging_id) ON DELETE CASCADE,
            transaction_type    TEXT    NOT NULL,
            quantity            REAL    NOT NULL,
            unit_cost           REAL    NOT NULL,
            reference           TEXT    NOT NULL,
            created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_packaging_trans_pkg ON packaging_transactions(packaging_id);",
    )?;

    seed_packaging(conn)?;

    // ── 8. app_notifications (v2.2: Persistent SQLite Notification Center) ───
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS app_notifications (
            id                TEXT PRIMARY KEY,
            notification_type TEXT NOT NULL,
            severity          TEXT NOT NULL,
            title             TEXT NOT NULL,
            message           TEXT NOT NULL,
            details           TEXT,
            action_label      TEXT,
            action_url        TEXT,
            created_at        TEXT NOT NULL,
            is_read           INTEGER NOT NULL DEFAULT 0,
            is_dismissed      INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_app_notifs_active 
            ON app_notifications (is_dismissed, created_at DESC);",
    )?;

    seed_notifications(conn)?;

    Ok(())
}

fn seed_packaging(conn: &Connection) -> Result<()> {
    let existing: i64 = conn
        .query_row("SELECT COUNT(*) FROM packaging", [], |row| row.get(0))
        .unwrap_or(0);

    if existing > 0 {
        return Ok(());
    }

    let seeds: Vec<(&str, &str, &str, &str, f64, f64, f64)> = vec![
        ("PKG-BML-01", "Banana Muffin Liner",            "Liner",     "Piece", 2.0,  500.0, 100.0),
        ("PKG-BMB-02", "Banana Muffin Box",              "Box",       "Piece", 15.0,  50.0,  20.0),
        ("PKG-BBB-03", "Banana Bread Box",               "Box",       "Box",   15.0,  40.0,  15.0),
        ("PKG-CCL-04", "Custard Clamshell",              "Clamshell", "Piece", 8.0,   60.0,  20.0),
        ("PKG-ESH-05", "Ensaymada Sheet",                "Sheet",     "Sheet", 1.0,  300.0,  50.0),
        ("PKG-CCL-06", "Cupcake Liner",                  "Liner",     "Piece", 1.0,  400.0, 100.0),
        ("PKG-YCC-07", "Yema Cake Container",            "Container", "Piece", 6.0,   80.0,  25.0),
        ("PKG-MML-08", "Mammon Liner",                   "Liner",     "Piece", 1.0,  250.0,  50.0),
        ("PKG-SBP-09", "Spanish Bread Packaging",        "Wrapper",   "Piece", 2.0,  200.0,  50.0),
        ("PKG-MCC-10", "Moist Cake Container",           "Container", "Piece", 6.0,   80.0,  25.0),
        ("PKG-TSP-11", "Taisan Packaging",               "Bag",       "Piece", 13.0,  50.0,  15.0),
        ("PKG-LYM-12", "Lengua de Gato/Yema/Moist Cake", "Container", "Piece", 6.0,   75.0,  20.0),
    ];

    for (code, name, pkg_type, unit, cost, stock, reorder) in seeds {
        conn.execute(
            "INSERT OR IGNORE INTO packaging (packaging_code, name, packaging_type, unit, current_unit_cost, current_stock_qty, reorder_threshold, is_active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)",
            params![code, name, pkg_type, unit, cost, stock, reorder],
        )?;
    }

    Ok(())
}

fn seed_units(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "INSERT OR IGNORE INTO units (code, name, unit_type, is_base) VALUES
            ('g',     'Gram',       'weight', 1),
            ('kg',    'Kilogram',   'weight', 0),
            ('oz',    'Ounce',      'weight', 0),
            ('lb',    'Pound',      'weight', 0),
            ('ml',    'Milliliter', 'volume', 1),
            ('L',     'Liter',      'volume', 0),
            ('tsp',   'Teaspoon',   'volume', 0),
            ('tbsp',  'Tablespoon', 'volume', 0),
            ('cup',   'Cup',        'volume', 0),
            ('pcs',   'Piece',      'count',  1),
            ('pack',  'Pack',       'count',  0),
            ('box',   'Box',        'count',  0),
            ('bottle','Bottle',     'count',  0),
            ('can',   'Can',        'count',  0);",
    )?;
    Ok(())
}

#[allow(clippy::cognitive_complexity)]
fn populate_usda_conversion_factors(conn: &Connection) {
    // Map USDA standard baking conversion factors onto existing ingredient_conversions.
    // This runs idempotently — only updates rows where conversion_factor IS NULL.
    let usda_mappings: Vec<(&str, &str, &str, f64)> = vec![
        // (ingredient_name_like, recipe_unit, base_code, conversion_factor)
        ("%Flour%",         "Cup",        "g",  125.0),
        ("%Flour%",         "Tablespoon", "g",  7.8),
        ("%Flour%",         "Gram",       "g",  1.0),
        ("Granulated Sugar","Cup",        "g",  200.0),
        ("Granulated Sugar","Tablespoon", "g",  12.5),
        ("Granulated Sugar","Gram",       "g",  1.0),
        ("Brown Sugar%",    "Cup",        "g",  213.0),
        ("Brown Sugar%",    "Tablespoon", "g",  12.5),
        ("Brown Sugar%",    "Gram",       "g",  1.0),
        ("%Butter%",        "Cup",        "g",  227.0),
        ("%Butter%",        "Gram",       "g",  1.0),
        ("%Butter%",        "Stick",      "g",  113.0),
        ("Cocoa Powder",    "Cup",        "g",  100.0),
        ("%Milk%",          "Cup",        "ml", 240.0),
        ("%Milk%",          "ml",         "ml", 1.0),
        ("%Milk%",          "Tablespoon", "ml", 15.0),
        ("%Oil%",           "Cup",        "ml", 240.0),
        ("Vanilla%",        "tsp",        "ml", 5.0),
        ("Baking Powder",   "tsp",        "g",  5.0),
        ("Baking Soda",     "tsp",        "g",  5.0),
        ("%Egg%",           "pcs",        "pcs",1.0),
    ];

    for (name_like, recipe_unit, base_code, factor) in usda_mappings {
        let _ = conn.execute(
            "UPDATE ingredient_conversions
             SET conversion_factor = ?1,
                 from_unit_id = (SELECT unit_id FROM units WHERE LOWER(name) = LOWER(?2) OR LOWER(code) = LOWER(?2) LIMIT 1),
                 to_unit_id = (SELECT unit_id FROM units WHERE code = ?3 LIMIT 1),
                 source = 'USDA NDB'
             WHERE conversion_factor IS NULL
               AND ingredient_id IN (SELECT ingredient_id FROM ingredients WHERE name LIKE ?4)
               AND recipe_unit = ?2",
            params![factor, recipe_unit, base_code, name_like],
        );
    }
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

#[allow(clippy::type_complexity)]
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

fn seed_notifications(conn: &Connection) -> Result<()> {
    let existing: i64 = conn
        .query_row("SELECT COUNT(*) FROM app_notifications", [], |row| row.get(0))
        .unwrap_or(0);

    if existing > 0 {
        return Ok(());
    }

    let seeds = vec![
        (
            "alert-unpriced-pantry-items",
            "alert",
            "warning",
            "Immediate Action: Unpriced Pantry Ingredients Detected",
            "Pantry ingredients lack purchase pricing, causing inaccurate batch costing.",
            Some("Without purchase costs, recipes using these ingredients cannot compute accurate batch costs, target markups, or gross margins. Review and set purchase prices in the ingredients master list to prevent margin leakage."),
            Some("Price Ingredients in Pantry"),
            Some("/ingredients"),
            chrono::Utc::now().to_rfc3339(),
        ),
        (
            "notif-new-ingredient-created",
            "notification",
            "success",
            "New Ingredient Added",
            "A new ingredient 'Organic Madagascar Vanilla' has been created.",
            Some("Registered in pantry master catalog with unit of measure (ml), storage location, and initial packaging specifications."),
            Some("View in Pantry"),
            Some("/ingredients"),
            chrono::Utc::now().to_rfc3339(),
        ),
        (
            "notif-recipe-formula-updated",
            "notification",
            "info",
            "Recipe Formula Synchronized",
            "Formula for 'Artisan Croissant' has updated ingredient proportions.",
            Some("Yield of 24 units with target retail markup of 60.0% has been recalculated using live FIFO ingredient purchase rates."),
            Some("View Recipes"),
            Some("/recipes"),
            chrono::Utc::now().to_rfc3339(),
        ),
    ];

    for (id, ntype, severity, title, message, details, action_label, action_url, created_at) in seeds {
        conn.execute(
            "INSERT OR IGNORE INTO app_notifications 
             (id, notification_type, severity, title, message, details, action_label, action_url, created_at, is_read, is_dismissed)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, 0)",
            params![id, ntype, severity, title, message, details, action_label, action_url, created_at],
        )?;
    }

    Ok(())
}
