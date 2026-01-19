use crate::{
    entities::{prelude::*, variables},
    error::CyberAPIError,
};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, DbErr, EntityTrait, QueryFilter, Set};
use serde::{Deserialize, Serialize};

use super::database::{ExportData, get_database};

#[derive(Deserialize, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Variable {
    pub id: String,
    pub category: String,
    pub collection: String,
    pub environment: Option<String>,
    pub name: Option<String>,
    pub value: Option<String>,
    pub enabled: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

impl From<variables::Model> for Variable {
    fn from(model: variables::Model) -> Self {
        Variable {
            id: model.id,
            category: model.category,
            collection: model.collection,
            environment: model.environment,
            name: model.name,
            value: model.value,
            enabled: model.enabled,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}
impl Variable {
    fn into_active_model(self) -> variables::ActiveModel {
        let created_at = self.created_at.or_else(|| Some(Utc::now().to_rfc3339()));
        let updated_at = self.updated_at.or_else(|| Some(Utc::now().to_rfc3339()));
        variables::ActiveModel {
            id: Set(self.id),
            category: Set(self.category),
            collection: Set(self.collection),
            environment: Set(self.environment),
            name: Set(self.name),
            value: Set(self.value),
            enabled: Set(self.enabled),
            created_at: Set(created_at),
            updated_at: Set(updated_at),
        }
    }
}

pub fn get_variables_create_sql() -> String {
    "CREATE TABLE IF NOT EXISTS variables (
            id TEXT PRIMARY KEY NOT NULL check (id != ''),
            category TEXT NOT NULL check (category != ''),
            collection TEXT NOT NULL check (collection != ''),
            environment TEXT DEFAULT '',
            name TEXT DEFAULT '',
            value TEXT DEFAULT '',
            enabled TEXT DEFAULT '',
            created_at TEXT DEFAULT '',
            updated_at TEXT DEFAULT ''
        )"
    .to_string()
}

pub async fn add_variable(value: Variable) -> Result<Variable, DbErr> {
    let model = value.into_active_model();
    let db = get_database().await;
    let result = model.insert(&db).await?;
    Ok(result.into())
}

pub async fn update_variable(value: Variable) -> Result<Variable, DbErr> {
    let model = value.into_active_model();
    let db = get_database().await;
    let result = model.update(&db).await?;
    Ok(result.into())
}

pub async fn list_variable(collection: String, category: String) -> Result<Vec<Variable>, DbErr> {
    let db = get_database().await;
    let result = Variables::find()
        .filter(variables::Column::Collection.eq(collection))
        .filter(variables::Column::Category.eq(category))
        .all(&db)
        .await?;
    Ok(result.into_iter().map(Variable::from).collect())
}

pub async fn delete_variable(ids: Vec<String>) -> Result<u64, DbErr> {
    let db = get_database().await;
    let result = Variables::delete_many()
        .filter(variables::Column::Id.is_in(ids))
        .exec(&db)
        .await?;
    Ok(result.rows_affected)
}

pub fn get_table_name_variable() -> String {
    "variables".to_string()
}

pub async fn delete_all_variable() -> Result<(), CyberAPIError> {
    let db = get_database().await;
    Variables::delete_many().exec(&db).await?;
    Ok(())
}

pub async fn export_variable() -> Result<ExportData, DbErr> {
    let db = get_database().await;
    let data = Variables::find().into_json().all(&db).await?;
    Ok(ExportData {
        name: get_table_name_variable(),
        data,
    })
}

pub async fn import_variable(data: Vec<serde_json::Value>) -> Result<(), CyberAPIError> {
    let db = get_database().await;

    let mut records = Vec::new();
    for ele in data {
        let model = variables::ActiveModel::from_json(ele)?;
        records.push(model);
    }
    Variables::insert_many(records).exec(&db).await?;
    Ok(())
}
