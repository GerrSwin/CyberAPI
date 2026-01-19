use crate::{
    entities::{prelude::*, proxies},
    error::CyberAPIError,
};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbErr, EntityTrait, QueryFilter, QueryOrder, Set};
use serde::{Deserialize, Serialize};

use super::database::{ExportData, get_database};

#[derive(Deserialize, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Proxy {
    pub id: String,
    pub proxy: Option<String>,
    pub list: Option<String>,
    pub mode: Option<String>,
    pub enabled: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

impl From<proxies::Model> for Proxy {
    fn from(model: proxies::Model) -> Self {
        Proxy {
            id: model.id,
            proxy: model.proxy,
            list: model.list,
            mode: model.mode,
            enabled: model.enabled,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

impl Proxy {
    fn into_active_model(self) -> proxies::ActiveModel {
        let created_at = self.created_at.or_else(|| Some(Utc::now().to_rfc3339()));
        let updated_at = self.updated_at.or_else(|| Some(Utc::now().to_rfc3339()));
        proxies::ActiveModel {
            id: Set(self.id),
            proxy: Set(self.proxy),
            list: Set(self.list),
            mode: Set(self.mode),
            enabled: Set(self.enabled),
            created_at: Set(created_at),
            updated_at: Set(updated_at),
        }
    }
}

pub fn get_proxies_create_sql() -> String {
    "CREATE TABLE IF NOT EXISTS proxies (
        id TEXT PRIMARY KEY NOT NULL check (id != ''),
        proxy TEXT DEFAULT '',
        list TEXT DEFAULT '',
        mode TEXT DEFAULT '',
        enabled TEXT DEFAULT '1',
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT ''
    )"
    .to_string()
}

pub async fn add_proxy(proxy: Proxy) -> Result<Proxy, DbErr> {
    let model = proxy.into_active_model();
    let db = get_database().await;
    let result = model.insert(&db).await?;
    Ok(result.into())
}

pub async fn update_proxy(proxy: Proxy) -> Result<Proxy, DbErr> {
    let model = proxy.into_active_model();
    let db = get_database().await;
    let result = model.update(&db).await?;
    Ok(result.into())
}

pub async fn list_proxy() -> Result<Vec<Proxy>, DbErr> {
    let db = get_database().await;
    let result = Proxies::find()
        .order_by_asc(proxies::Column::CreatedAt)
        .all(&db)
        .await?;
    Ok(result.into_iter().map(Proxy::from).collect())
}

pub async fn delete_proxy(ids: Vec<String>) -> Result<u64, DbErr> {
    let db = get_database().await;
    let result = Proxies::delete_many()
        .filter(proxies::Column::Id.is_in(ids))
        .exec(&db)
        .await?;
    Ok(result.rows_affected)
}

pub fn get_table_name_proxy() -> String {
    "proxies".to_string()
}

pub async fn delete_all_proxy() -> Result<(), CyberAPIError> {
    let db = get_database().await;
    Proxies::delete_many().exec(&db).await?;
    Ok(())
}

pub async fn export_proxy() -> Result<ExportData, DbErr> {
    let db = get_database().await;
    let data = Proxies::find().into_json().all(&db).await?;
    Ok(ExportData {
        name: get_table_name_proxy(),
        data,
    })
}

pub async fn import_proxy(data: Vec<serde_json::Value>) -> Result<(), CyberAPIError> {
    let db = get_database().await;

    let mut records = Vec::new();
    for ele in data {
        let model = proxies::ActiveModel::from_json(ele)?;
        records.push(model);
    }
    Proxies::insert_many(records).exec(&db).await?;
    Ok(())
}
