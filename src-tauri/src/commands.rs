use crate::error::CyberAPIError;
use crate::schemas::{self, APICollection, APIFolder, APISetting, Environment, Proxy, Variable};
use crate::settings;
use crate::util;
use crate::{cookies, http_request};
use serde_json::Value;
use tauri::command;

pub type CommandResult<T> = Result<T, CyberAPIError>;

// Add API setting
#[command(async)]
pub async fn add_api_setting(setting: APISetting) -> CommandResult<APISetting> {
    let result = schemas::add_api_setting(setting).await?;
    Ok(result)
}

// Update API setting
#[command(async)]
pub async fn update_api_setting(setting: APISetting) -> CommandResult<APISetting> {
    let result = schemas::update_api_setting(setting).await?;
    Ok(result)
}

// Initialize database
#[command(async)]
pub async fn init_tables() -> CommandResult<()> {
    schemas::init_tables().await?;
    Ok(())
}

#[command(async)]
pub fn set_db_path(path: String) -> CommandResult<()> {
    util::set_db_path(path);
    Ok(())
}

#[command(async)]
pub async fn export_tables() -> CommandResult<String> {
    let filename = schemas::export_tables().await?;
    Ok(filename)
}

#[command(async)]
pub async fn import_tables(file: String) -> CommandResult<()> {
    schemas::import_tables(file).await?;
    Ok(())
}

// List all API settings
#[command(async)]
pub async fn list_api_setting(collection: String) -> CommandResult<Vec<APISetting>> {
    let result = schemas::list_api_setting(collection).await?;
    Ok(result)
}

// Delete API settings
#[command(async)]
pub async fn delete_api_settings(ids: Vec<String>) -> CommandResult<()> {
    schemas::delete_api_settings(ids).await?;
    Ok(())
}

// Add collection
#[command(async)]
pub async fn add_api_collection(collection: APICollection) -> CommandResult<APICollection> {
    let result = schemas::add_api_collection(collection).await?;
    Ok(result)
}

// Update collection
#[command(async)]
pub async fn update_api_collection(collection: APICollection) -> CommandResult<APICollection> {
    let result = schemas::update_api_collection(collection).await?;
    Ok(result)
}

// List all collections
#[command(async)]
pub async fn list_api_collection() -> CommandResult<Vec<APICollection>> {
    let result = schemas::list_api_collection().await?;
    Ok(result)
}

#[command(async)]
pub async fn delete_api_collection(id: String) -> CommandResult<u64> {
    schemas::delete_api_setting_by_collection(id.clone()).await?;
    schemas::delete_api_folder_by_collection(id.clone()).await?;
    let count = schemas::delete_api_collection(id).await?;
    Ok(count)
}

// Add API folder
#[command(async)]
pub async fn add_api_folder(folder: APIFolder) -> CommandResult<APIFolder> {
    let result = schemas::add_api_folder(folder).await?;
    Ok(result)
}

// Update API folder
#[command(async)]
pub async fn update_api_folder(folder: APIFolder) -> CommandResult<APIFolder> {
    let result = schemas::update_api_folder(folder).await?;
    Ok(result)
}

// List all API folders
#[command(async)]
pub async fn list_api_folder(collection: String) -> CommandResult<Vec<APIFolder>> {
    let result = schemas::list_api_folder(collection).await?;
    Ok(result)
}

// Delete all subfolders for the API folder
#[command(async)]
pub async fn delete_api_folder(id: String) -> CommandResult<schemas::APIFolderChildren> {
    let mut result = schemas::list_api_folder_all_children(id.clone()).await?;
    result.folders.push(id);
    schemas::delete_api_folders(result.folders.clone()).await?;
    schemas::delete_api_settings(result.settings.clone()).await?;
    Ok(result)
}

// Add variable
#[command(async)]
pub async fn add_variable(value: Variable) -> CommandResult<Variable> {
    let result = schemas::add_variable(value).await?;
    Ok(result)
}

// Update variable
#[command(async)]
pub async fn update_variable(value: Variable) -> CommandResult<Variable> {
    let result = schemas::update_variable(value).await?;
    Ok(result)
}

// Delete variable(s)
#[command(async)]
pub async fn delete_variable(ids: Vec<String>) -> CommandResult<u64> {
    let count = schemas::delete_variable(ids).await?;
    Ok(count)
}

// Proxy
#[command(async)]
pub async fn add_proxy(proxy: Proxy) -> CommandResult<Proxy> {
    let result = schemas::add_proxy(proxy).await?;
    Ok(result)
}

#[command(async)]
pub async fn update_proxy(proxy: Proxy) -> CommandResult<Proxy> {
    let result = schemas::update_proxy(proxy).await?;
    Ok(result)
}

#[command(async)]
pub async fn delete_proxy(ids: Vec<String>) -> CommandResult<u64> {
    let count = schemas::delete_proxy(ids).await?;
    Ok(count)
}

#[command(async)]
pub async fn list_proxy() -> CommandResult<Vec<Proxy>> {
    let result = schemas::list_proxy().await?;
    Ok(result)
}
// List all variables
#[command(async)]
pub async fn list_variable(collection: String, category: String) -> CommandResult<Vec<Variable>> {
    let result = schemas::list_variable(collection, category).await?;
    Ok(result)
}

// Add environment
#[command(async)]
pub async fn add_environment(value: Environment) -> CommandResult<Environment> {
    let result = schemas::add_environment(value).await?;
    Ok(result)
}

// Update environment
#[command(async)]
pub async fn update_environment(value: Environment) -> CommandResult<Environment> {
    let result = schemas::update_environment(value).await?;
    Ok(result)
}

// Delete environment
#[command(async)]
pub async fn delete_environment(ids: Vec<String>) -> CommandResult<u64> {
    let count = schemas::delete_environment(ids).await?;
    Ok(count)
}

// List all environments
#[command(async)]
pub async fn list_environment(collection: String) -> CommandResult<Vec<Environment>> {
    let result = schemas::list_environment(collection).await?;
    Ok(result)
}

// Execute HTTP request
#[command(async)]
pub async fn do_http_request(
    api: String,
    req: http_request::HTTPRequest,
    timeout: http_request::RequestTimeout,
) -> CommandResult<http_request::HTTPResponse> {
    http_request::request(api, req, timeout).await
}

// List all cookies
#[command(async)]
pub fn list_cookie() -> CommandResult<Vec<String>> {
    cookies::list_cookie()
}

// Delete cookie
#[command(async)]
pub fn delete_cookie(c: cookies::Cookie) -> CommandResult<()> {
    cookies::delete_cookie_from_store(c)?;
    Ok(())
}

// Add cookie
#[command(async)]
pub fn add_cookie(c: cookies::Cookie) -> CommandResult<()> {
    cookies::add_cookie(c)?;
    Ok(())
}

// Clear cookies
#[command(async)]
pub fn clear_cookie() -> CommandResult<()> {
    cookies::clear_cookie_from_store()?;
    Ok(())
}

#[command(async)]
pub fn get_settings() -> CommandResult<Option<Value>> {
    let data = settings::load_settings()?;
    Ok(data)
}

#[command(async)]
pub fn save_settings(setting: Value) -> CommandResult<()> {
    settings::save_settings(setting)?;
    Ok(())
}

#[command(async)]
pub fn clear_settings() -> CommandResult<()> {
    settings::clear_settings()?;
    Ok(())
}

// Get latest version
#[command(async)]
pub async fn get_latest_version() -> CommandResult<schemas::Version> {
    let result = schemas::get_latest_version().await?;
    Ok(result)
}

// Add version record
#[command(async)]
pub async fn add_version(version: schemas::Version) -> CommandResult<()> {
    schemas::add_version(version).await?;
    Ok(())
}
