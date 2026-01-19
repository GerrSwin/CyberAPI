use crate::error::CyberAPIError;
use crate::util;
use serde_json::Value;
use std::fs;
use std::fs::File;
use std::io::{BufReader, BufWriter};
use std::path::{Path, PathBuf};
use tracing::warn;

const SETTINGS_FILE: &str = "settings.json";

fn resolve_settings_file() -> PathBuf {
    let app_dir = Path::new(util::get_app_dir());
    app_dir.join(SETTINGS_FILE)
}

fn resolve_settings_file_for_read() -> PathBuf {
    let primary = resolve_settings_file();
    if primary.is_file() {
        return primary;
    }
    if let Some(legacy) = util::legacy_app_file(SETTINGS_FILE) {
        if legacy.is_file() {
            if let Some(parent) = primary.parent() {
                if parent != legacy.parent().unwrap_or(parent) {
                    if let Err(err) = fs::create_dir_all(parent) {
                        warn!("failed to create settings dir {:?}: {}", parent, err);
                    } else if let Err(err) = fs::copy(&legacy, &primary) {
                        warn!(
                            "failed to migrate legacy settings from {:?}: {}",
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

pub fn load_settings() -> Result<Option<Value>, CyberAPIError> {
    let filename = resolve_settings_file_for_read();
    if !filename.is_file() {
        return Ok(None);
    }
    let file = File::open(filename)?;
    let reader = BufReader::new(file);
    let value = serde_json::from_reader(reader)?;
    Ok(Some(value))
}

pub fn save_settings(value: Value) -> Result<(), CyberAPIError> {
    let filename = resolve_settings_file();
    if let Some(parent) = filename.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)?;
        }
    }
    let file = File::create(filename)?;
    let writer = BufWriter::new(file);
    serde_json::to_writer_pretty(writer, &value)?;
    Ok(())
}

pub fn clear_settings() -> Result<(), CyberAPIError> {
    let filename = resolve_settings_file();
    if filename.is_file() {
        fs::remove_file(filename)?;
    }
    if let Some(legacy) = util::legacy_app_file(SETTINGS_FILE) {
        if legacy.is_file() {
            if let Err(err) = fs::remove_file(legacy) {
                warn!("failed to remove legacy settings file: {}", err);
            }
        }
    }
    Ok(())
}
