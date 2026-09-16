// Kingdom Passion Academy — Windows Desktop Wrapper (local-first)
//
// The Tauri shell starts the bundled Node runtime as a sidecar and points it
// at the packaged standalone Next.js server. The server runs in local mode
// and keeps its SQLite database under the OS application-data directory.

use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("could not resolve app data directory");
            std::fs::create_dir_all(&app_data_dir)
                .expect("could not create KPA-OS application data directory");

            let resource_dir = app
                .path()
                .resource_dir()
                .expect("could not resolve KPA-OS resource directory");
            let server_path = resource_dir.join("local-server-dist").join("server.js");

            let sidecar_command = app
                .shell()
                .sidecar("kpa-local-server")
                .expect("failed to create KPA-OS local server sidecar")
                .args([server_path.to_string_lossy().as_ref()])
                .env("DATA_MODE", "local")
                .env("LOCAL_DB_DIR", app_data_dir.to_string_lossy().to_string())
                .env("PORT", "4173")
                .env("HOSTNAME", "127.0.0.1");

            let (mut rx, _child) = sidecar_command
                .spawn()
                .expect("failed to start KPA-OS local server sidecar");

            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    if let CommandEvent::Stderr(line) = event {
                        eprintln!("[kpa-local-server] {}", String::from_utf8_lossy(&line));
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Kingdom Passion Academy desktop app");
}
