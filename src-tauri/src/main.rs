// Kingdom Passion Academy — Windows Desktop Wrapper (local-first)
//
// On startup this spawns the bundled Node server (the sidecar binary built
// from the standalone Next.js output) with DATA_MODE=local, pointing it at a
// per-install SQLite file under the OS app-data directory. Once the sidecar
// is listening on localhost, the window (configured in tauri.conf.json) loads
// that local URL -- so the whole app runs offline by default, and only syncs
// to Supabase in the background when internet is available.

use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("could not resolve app data directory");

            std::fs::create_dir_all(&app_data_dir).ok();

            let sidecar_command = app
                .shell()
                .sidecar("kpa-local-server")
                .expect("failed to create sidecar command")
                .env("DATA_MODE", "local")
                .env("LOCAL_DB_DIR", app_data_dir.to_string_lossy().to_string())
                .env("PORT", "4173");

            let (mut rx, _child) = sidecar_command.spawn().expect("failed to spawn local server sidecar");

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
