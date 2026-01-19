fn main() {
    let dist_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../dist");
    let _ = std::fs::create_dir_all(&dist_dir);

    tauri_build::build()
}
