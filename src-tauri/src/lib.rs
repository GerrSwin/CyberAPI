use std::fs;
use std::path::Path;

use tauri::Manager;
use tracing::warn;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tracing_subscriber::prelude::*;

mod commands;
mod cookies;
mod entities;
mod error;
mod http_request;
mod schemas;
mod settings;
mod util;

fn migrate_from_appdata_to_portable(
    app_data_dir: &Path,
    portable_dir: &Path,
) -> std::io::Result<()> {
    // If user had data in app-data (previous build), move it to the portable folder on first portable run.
    let migrate_file = |filename: &str| -> std::io::Result<()> {
        let source = app_data_dir.join(filename);
        let target = portable_dir.join(filename);
        if target.exists() || !source.exists() {
            return Ok(());
        }
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(source, target)?;
        Ok(())
    };

    migrate_file("settings.json")?;
    migrate_file("db.db")?;

    Ok(())
}

pub fn run() {
    tracing_subscriber::registry()
        .with(http_request::HTTPTraceLayer)
        .init();

    let context = tauri::generate_context!();
    /* let menu = if cfg!(windows) {
        Menu::new()
    } else {
        Menu::os_default(&context.package_info().name)
    }; */

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            // Always run in portable mode: keep data next to the executable.
            // On first run after this change, migrate data from the previous per-user app data dir.
            let portable_dir = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|v| v.to_path_buf()))
                .or_else(|| app.path().app_data_dir().ok())
                .expect("unable to resolve app directory");

            let legacy_app_dir = app.path().app_data_dir().ok();
            util::set_legacy_app_dir(legacy_app_dir.clone());

            if let Some(app_data_dir) = legacy_app_dir {
                if let Err(err) = migrate_from_appdata_to_portable(&app_data_dir, &portable_dir) {
                    warn!("failed to migrate data from app data dir: {}", err);
                }
            }

            if let Err(err) = fs::create_dir_all(&portable_dir) {
                warn!(
                    "failed to create app data directory {:?}: {}",
                    portable_dir, err
                );
            }
            util::set_app_dir(portable_dir.to_str().unwrap().to_string());
            if let Some(window) = app.get_webview_window("main") {
                let _ = window
                    .eval("window.addEventListener('contextmenu', (e) => e.preventDefault());");
            }
            Ok(())
        })
        //.menu(menu)
        .invoke_handler(tauri::generate_handler![
            commands::init_tables,
            commands::set_db_path,
            commands::export_tables,
            commands::import_tables,
            commands::add_api_setting,
            commands::update_api_setting,
            commands::list_api_setting,
            commands::delete_api_settings,
            commands::add_api_folder,
            commands::update_api_folder,
            commands::list_api_folder,
            commands::delete_api_folder,
            commands::add_api_collection,
            commands::update_api_collection,
            commands::list_api_collection,
            commands::delete_api_collection,
            commands::do_http_request,
            commands::list_cookie,
            commands::delete_cookie,
            commands::add_cookie,
            commands::clear_cookie,
            commands::add_variable,
            commands::update_variable,
            commands::delete_variable,
            commands::list_variable,
            commands::add_proxy,
            commands::update_proxy,
            commands::delete_proxy,
            commands::list_proxy,
            commands::add_environment,
            commands::update_environment,
            commands::delete_environment,
            commands::list_environment,
            commands::get_settings,
            commands::save_settings,
            commands::clear_settings,
            commands::get_latest_version,
            commands::add_version,
        ])
        .run(context)
        .expect("error while running tauri application");
}
