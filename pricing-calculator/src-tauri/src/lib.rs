mod db;
mod models;
mod commands;

use tauri::Manager;
use commands::DbState;
use db::{get_db_path, initialize_database};
use rusqlite::Connection;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Ensure the app data directory exists
            let db_path = get_db_path(app.handle());
            if let Some(parent) = db_path.parent() {
                std::fs::create_dir_all(parent)?;
            }

            // Open (or create) the SQLite database
            let conn = Connection::open(&db_path)
                .expect("Failed to open SQLite database");

            // Run migrations / seed data
            initialize_database(&conn, &db_path)
                .expect("Failed to initialize database");

            // Register the DB connection as managed state
            app.manage(DbState(Mutex::new(conn)));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_units,
            commands::get_ingredient_purchases,
            commands::create_ingredient_purchase,
            commands::update_ingredient_purchase,
            commands::delete_ingredient_purchase,
            commands::get_ingredients,
            commands::create_ingredient,
            commands::update_ingredient,
            commands::delete_ingredient,
            commands::get_recipes,
            commands::create_recipe,
            commands::update_recipe,
            commands::delete_recipe,
            commands::get_recipe_ingredients,
            commands::upsert_recipe_ingredient,
            commands::remove_recipe_ingredient,
            commands::calculate_recipe_cost,
            commands::get_settings,
            commands::set_setting,
            commands::export_data_csv,
            commands::backup_database,
            commands::receive_inventory,
            commands::get_inventory_ledger,
            commands::produce_batch_with_validation,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
