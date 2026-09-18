// Kingdom Passion Academy — Windows Desktop Wrapper (local-first)
//
// The Tauri shell starts the bundled Node runtime as a sidecar and points it
// at the packaged standalone Next.js server. The server runs in local mode
// and keeps its SQLite database under the OS application-data directory.

use tauri::Manager;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use uuid::Uuid;

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

            // Generate the HMAC secret once per desktop installation and keep
            // it in the application's private data directory. This removes
            // the need to hand-edit .env.local on every Windows machine while
            // keeping the local PIN session signing key stable across updates.
            let secret_path = app_data_dir.join("local-session-secret");
            let local_session_secret = match std::fs::read_to_string(&secret_path) {
                Ok(value) if !value.trim().is_empty() => value.trim().to_string(),
                _ => {
                    let value = Uuid::new_v4().to_string().replace('-', "");
                    std::fs::write(&secret_path, &value)
                        .expect("could not persist KPA-OS local session secret");
                    value
                }
            };

            let resource_dir = app
                .path()
                .resource_dir()
                .expect("could not resolve KPA-OS resource directory");

            let flat_server_path = resource_dir.join("server.js");
            let nested_server_path = resource_dir.join("local-server-dist").join("server.js");

            let server_dir = if flat_server_path.exists() {
                resource_dir.clone()
            } else if nested_server_path.exists() {
                resource_dir.join("local-server-dist")
            } else {
                panic!(
                    "KPA-OS local server resource is missing; checked {} and {}",
                    flat_server_path.display(),
                    nested_server_path.display()
                );
            };

            // Do not pass an absolute Windows path as a positional Node entrypoint.
            // Node 24 can interpret a drive-qualified argument incorrectly when
            // it is transported through the Tauri shell sidecar. Set the working
            // directory to the packaged server directory and use a relative entrypoint.
            let sidecar_command = app
                .shell()
                .sidecar("kpa-local-server")
                .expect("failed to create KPA-OS local server sidecar")
                .current_dir(server_dir.to_string_lossy().to_string())
                .args(["server.js"])
                .env("DATA_MODE", "local")
                .env("LOCAL_DB_DIR", app_data_dir.to_string_lossy().to_string())
                .env("LOCAL_SESSION_SECRET", local_session_secret)
                .env("PORT", "4173")
                .env("HOSTNAME", "127.0.0.1")
                // Explicitly enabled only in the packaged local desktop build so the tester can enter without a password/PIN.
                .env("KPA_TEST_MODE", "1");

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
