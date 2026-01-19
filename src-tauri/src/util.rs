use once_cell::sync::OnceCell;
use std::path::PathBuf;
use std::sync::Mutex;

static APP_DIR: OnceCell<String> = OnceCell::new();
static DB_PATH: OnceCell<Mutex<Option<String>>> = OnceCell::new();
static LEGACY_APP_DIR: OnceCell<PathBuf> = OnceCell::new();

pub fn set_app_dir(dir: String) {
    APP_DIR.set(dir).unwrap();
}

pub fn get_app_dir() -> &'static String {
    APP_DIR.get().unwrap()
}

pub fn set_legacy_app_dir(dir: Option<PathBuf>) {
    if let Some(dir) = dir {
        let _ = LEGACY_APP_DIR.set(dir);
    }
}

pub fn legacy_app_dir() -> Option<&'static PathBuf> {
    LEGACY_APP_DIR.get()
}

pub fn legacy_app_file(filename: &str) -> Option<PathBuf> {
    legacy_app_dir().map(|dir| dir.join(filename))
}

pub fn set_db_path(path: String) {
    let store = DB_PATH.get_or_init(|| Mutex::new(None));
    let mut guard = store.lock().unwrap();
    if path.trim().is_empty() {
        *guard = None;
    } else {
        *guard = Some(path);
    }
}

pub fn get_db_path() -> Option<String> {
    let store = DB_PATH.get()?;
    let guard = store.lock().ok()?;
    guard.clone()
}
