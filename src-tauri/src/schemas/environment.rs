use crate::{
    entities::{environments, prelude::*},
    error::CyberAPIError,
};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbErr, EntityTrait, QueryFilter, Set};
use serde::{Deserialize, Serialize};

use super::database::{ExportData, get_database};

#[derive(Deserialize, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Environment {
    pub id: String,
    pub collection: String,
    pub name: Option<String>,
    pub enabled: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

impl From<environments::Model> for Environment {
    fn from(model: environments::Model) -> Self {
        Environment {
            id: model.id,
            collection: model.collection,
            name: model.name,
            enabled: model.enabled,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

impl Environment {
    fn into_active_model(self) -> environments::ActiveModel {
        let created_at = self.created_at.or_else(|| Some(Utc::now().to_rfc3339()));
        let updated_at = self.updated_at.or_else(|| Some(Utc::now().to_rfc3339()));
        environments::ActiveModel {
            id: Set(self.id),
            collection: Set(self.collection),
            name: Set(self.name),
            enabled: Set(self.enabled),
            created_at: Set(created_at),
            updated_at: Set(updated_at),
        }
    }
}

pub fn get_environments_create_sql() -> String {
    "CREATE TABLE IF NOT EXISTS environments (
            id TEXT PRIMARY KEY NOT NULL check (id != ''),
            collection TEXT NOT NULL check (collection != ''),
            name TEXT DEFAULT '',
            enabled TEXT DEFAULT '',
            created_at TEXT DEFAULT '',
            updated_at TEXT DEFAULT ''
        )"
    .to_string()
}

pub async fn add_environment(value: Environment) -> Result<Environment, DbErr> {
    let model = value.into_active_model();
    let db = get_database().await;
    let result = model.insert(&db).await?;
    Ok(result.into())
}

pub async fn update_environment(value: Environment) -> Result<Environment, DbErr> {
    let model = value.into_active_model();
    let db = get_database().await;
    let result = model.update(&db).await?;
    Ok(result.into())
}

pub async fn list_environment(collection: String) -> Result<Vec<Environment>, DbErr> {
    let db = get_database().await;
    let result = Environments::find()
        .filter(environments::Column::Collection.eq(collection))
        .all(&db)
        .await?;
    Ok(result.into_iter().map(Environment::from).collect())
}

pub async fn delete_environment(ids: Vec<String>) -> Result<u64, DbErr> {
    let db = get_database().await;
    let result = Environments::delete_many()
        .filter(environments::Column::Id.is_in(ids))
        .exec(&db)
        .await?;
    Ok(result.rows_affected)
}

pub fn get_table_name_environment() -> String {
    "environments".to_string()
}

pub async fn delete_all_environment() -> Result<(), CyberAPIError> {
    let db = get_database().await;
    Environments::delete_many().exec(&db).await?;
    Ok(())
}

pub async fn export_environment() -> Result<ExportData, DbErr> {
    let db = get_database().await;
    let data = Environments::find().into_json().all(&db).await?;
    Ok(ExportData {
        name: get_table_name_environment(),
        data,
    })
}

pub async fn import_environment(data: Vec<serde_json::Value>) -> Result<(), CyberAPIError> {
    let db = get_database().await;

    let mut records = Vec::new();
    for ele in data {
        let model = environments::ActiveModel::from_json(ele)?;
        records.push(model);
    }
    Environments::insert_many(records).exec(&db).await?;
    Ok(())
}
