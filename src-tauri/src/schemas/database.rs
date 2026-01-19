use crate::error::CyberAPIError;
use chrono::Local;
use sea_orm::{
    ConnectOptions, ConnectionTrait, Database, DatabaseConnection, DbErr, QueryResult, Statement,
};
use std::fs::OpenOptions;
use std::io::{Read, Write};
use std::time::Duration;
use std::vec;
use std::{
    env, fs,
    fs::File,
    path::{Path, PathBuf},
};
use tokio::sync::OnceCell;
use zip::write::FileOptions;

use crate::util;

use super::api_collection::{
    delete_all_api_collection, export_api_collection, get_api_collections_create_sql,
    get_table_name_api_collection, import_api_collection,
};
use super::api_folder::{
    delete_all_api_folder, export_api_folder, get_api_folders_create_sql,
    get_table_name_api_folder, import_api_folder,
};
use super::api_setting::{
    delete_all_api_setting, export_api_setting, get_api_settings_create_sql,
    get_table_name_api_setting, import_api_setting,
};
use super::environment::{
    delete_all_environment, export_environment, get_environments_create_sql,
    get_table_name_environment, import_environment,
};
use super::proxy::{
    delete_all_proxy, export_proxy, get_proxies_create_sql, get_table_name_proxy, import_proxy,
};
use super::variable::{
    delete_all_variable, export_variable, get_table_name_variable, get_variables_create_sql,
    import_variable,
};
use super::version::get_versions_table_create_sql;
use tracing::warn;

static DB: OnceCell<DatabaseConnection> = OnceCell::const_new();
const DB_FILENAME: &str = "db.db";

pub struct ExportData {
    pub name: String,
    pub data: Vec<serde_json::Value>,
}

fn expand_windows_env(input: &str) -> String {
    let chars: Vec<char> = input.chars().collect();
    let mut out = String::new();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '%' {
            let mut j = i + 1;
            while j < chars.len() && chars[j] != '%' {
                j += 1;
            }
            if j < chars.len() {
                let name: String = chars[i + 1..j].iter().collect();
                if !name.is_empty() {
                    if let Ok(value) = env::var(&name) {
                        out.push_str(&value);
                    } else {
                        out.push('%');
                        out.push_str(&name);
                        out.push('%');
                    }
                } else {
                    out.push('%');
                }
                i = j + 1;
                continue;
            }
        }
        out.push(chars[i]);
        i += 1;
    }
    out
}

fn expand_unix_env(input: &str) -> String {
    let chars: Vec<char> = input.chars().collect();
    let mut out = String::new();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '$' {
            if i + 1 < chars.len() && chars[i + 1] == '{' {
                let mut j = i + 2;
                while j < chars.len() && chars[j] != '}' {
                    j += 1;
                }
                if j < chars.len() {
                    let name: String = chars[i + 2..j].iter().collect();
                    if !name.is_empty() {
                        if let Ok(value) = env::var(&name) {
                            out.push_str(&value);
                        } else {
                            out.push_str(&format!("${{{}}}", name));
                        }
                    }
                    i = j + 1;
                    continue;
                }
            } else {
                let mut j = i + 1;
                while j < chars.len() && (chars[j].is_ascii_alphanumeric() || chars[j] == '_') {
                    j += 1;
                }
                if j > i + 1 {
                    let name: String = chars[i + 1..j].iter().collect();
                    if let Ok(value) = env::var(&name) {
                        out.push_str(&value);
                    } else {
                        out.push('$');
                        out.push_str(&name);
                    }
                    i = j;
                    continue;
                }
            }
        }
        out.push(chars[i]);
        i += 1;
    }
    out
}

fn expand_env_vars(input: &str) -> String {
    expand_unix_env(&expand_windows_env(input))
}

fn is_db_file(path: &Path) -> bool {
    if let Some(ext) = path.extension().and_then(|value| value.to_str()) {
        return ext.eq_ignore_ascii_case("db") || ext.eq_ignore_ascii_case("sqlite");
    }
    false
}

pub(crate) fn resolve_db_file() -> PathBuf {
    let app_dir = Path::new(util::get_app_dir());
    if let Some(path) = util::get_db_path() {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            let expanded = expand_env_vars(trimmed);
            let candidate = PathBuf::from(expanded);
            if is_db_file(&candidate) {
                return candidate;
            }
            return candidate.join(DB_FILENAME);
        }
    }
    let primary = app_dir.join(DB_FILENAME);
    if primary.is_file() {
        return primary;
    }
    if let Some(legacy) = util::legacy_app_file(DB_FILENAME) {
        if legacy.is_file() {
            if let Some(parent) = primary.parent() {
                if parent != legacy.parent().unwrap_or(parent) {
                    if let Err(err) = fs::create_dir_all(parent) {
                        warn!("failed to create database dir {:?}: {}", parent, err);
                    } else if let Err(err) = fs::copy(&legacy, &primary) {
                        warn!(
                            "failed to migrate legacy database from {:?}: {}",
                            legacy, err
                        );
                    } else {
                        return primary;
                    }
                }
            }
            return legacy;
        }
    }
    primary
}

async fn get_conn() -> DatabaseConnection {
    let file = resolve_db_file();
    if let Some(parent) = file.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    if !file.exists() {
        OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(&file)
            .unwrap();
    }

    let conn_uri = format!("sqlite://{}", file.into_os_string().into_string().unwrap());

    let mut opt = ConnectOptions::new(conn_uri);
    opt.max_connections(10)
        .min_connections(2)
        .connect_timeout(Duration::from_secs(5))
        .idle_timeout(Duration::from_secs(60));

    let result = Database::connect(opt).await;
    result.unwrap()
}

pub async fn get_database() -> DatabaseConnection {
    let db = DB.get_or_init(get_conn).await;
    db.to_owned()
}

pub async fn init_tables() -> Result<(), DbErr> {
    let db = get_database().await;
    let init_sql_list = vec![
        get_versions_table_create_sql(),
        get_api_collections_create_sql(),
        get_api_folders_create_sql(),
        get_api_settings_create_sql(),
        get_environments_create_sql(),
        get_proxies_create_sql(),
        get_variables_create_sql(),
    ];
    for sql in init_sql_list {
        db.execute(Statement::from_string(db.get_database_backend(), sql))
            .await?;
    }
    // Lightweight migrations for existing installs
    ensure_column(
        &db,
        &get_table_name_proxy(),
        "enabled",
        "enabled TEXT DEFAULT '1'",
    )
    .await?;
    Ok(())
}

pub async fn export_tables() -> Result<String, CyberAPIError> {
    let download = resolve_db_file().parent().unwrap().to_path_buf();

    let local = Local::now();

    let filename = format!("cyberapi-backup-{}.zip", local.format("%Y-%m-%d"));

    let file = File::create(&download.join(filename.clone()))?;
    let mut w = zip::ZipWriter::new(file);

    let table_data_list = vec![
        export_api_collection().await?,
        export_api_folder().await?,
        export_api_setting().await?,
        export_environment().await?,
        export_proxy().await?,
        export_variable().await?,
    ];
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    for table_data in table_data_list {
        let mut json = vec![];
        for ele in table_data.data {
            let str = serde_json::to_string(&ele)?;
            json.push(str);
        }
        let file_name = table_data.name + ".json";
        w.start_file(file_name, options)?;

        let file_data = format!("[{}]", json.join(","));
        w.write_all(file_data.as_bytes())?;
    }
    w.finish()?;

    Ok(filename)
}

pub async fn import_tables(filename: String) -> Result<(), CyberAPIError> {
    let mut r = zip::ZipArchive::new(File::open(filename)?)?;

    delete_all_api_collection().await?;
    delete_all_api_folder().await?;
    delete_all_api_setting().await?;
    delete_all_environment().await?;
    delete_all_proxy().await?;
    delete_all_variable().await?;

    let names = vec![
        get_table_name_api_collection(),
        get_table_name_api_folder(),
        get_table_name_api_setting(),
        get_table_name_environment(),
        get_table_name_proxy(),
        get_table_name_variable(),
    ];
    for name in names {
        let mut buf = Vec::new();
        let file_name = format!("{}.json", name);
        {
            let file = r.by_name(&file_name);
            if file.is_err() {
                continue;
            }
            let mut file = file?;
            file.read_to_end(&mut buf)?;
        }
        let data: Vec<serde_json::Value> = serde_json::from_slice(&buf)?;
        match name.as_str() {
            n if n == get_table_name_api_collection() => import_api_collection(data).await?,
            n if n == get_table_name_api_folder() => import_api_folder(data).await?,
            n if n == get_table_name_api_setting() => import_api_setting(data).await?,
            n if n == get_table_name_environment() => import_environment(data).await?,
            n if n == get_table_name_proxy() => import_proxy(data).await?,
            n if n == get_table_name_variable() => import_variable(data).await?,
            _ => (),
        }
    }

    Ok(())
}

async fn column_exists(db: &DatabaseConnection, table: &str, column: &str) -> Result<bool, DbErr> {
    let sql = format!("PRAGMA table_info({})", table);
    let rows: Vec<QueryResult> = db
        .query_all(Statement::from_string(db.get_database_backend(), sql))
        .await?;
    for row in rows {
        let name: String = row.try_get("", "name")?;
        if name == column {
            return Ok(true);
        }
    }
    Ok(false)
}

async fn ensure_column(
    db: &DatabaseConnection,
    table: &str,
    column: &str,
    column_def: &str,
) -> Result<(), DbErr> {
    if column_exists(db, table, column).await? {
        return Ok(());
    }
    let sql = format!("ALTER TABLE {} ADD COLUMN {}", table, column_def);
    db.execute(Statement::from_string(db.get_database_backend(), sql))
        .await?;
    Ok(())
}
