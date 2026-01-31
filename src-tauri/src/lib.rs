use tauri::Manager;

mod backlinks;
mod graph;
mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let window = app
                .get_webview_window("main")
                .ok_or("missing main window")?;

            let state_path = app
                .path()
                .app_config_dir()
                .map(|dir| dir.join("window-state.json"))?;

            if let Ok(state) = load_window_state(&state_path) {
                if !state.maximized {
                    let _ = window.set_size(tauri::LogicalSize::new(state.width, state.height));
                    let _ = window.set_position(tauri::LogicalPosition::new(state.x, state.y));
                } else {
                    let _ = window.maximize();
                }
            }

            let last_write = std::sync::Arc::new(std::sync::Mutex::new(std::time::Instant::now()));
            let state_path_for_events = state_path.clone();
            let last_write_for_events = last_write.clone();
            let window_for_events = window.clone();

            window.on_window_event(move |event| match event {
                tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) => {
                    let mut last = match last_write_for_events.lock() {
                        Ok(guard) => guard,
                        Err(_) => return,
                    };
                    if last.elapsed() < std::time::Duration::from_millis(200) {
                        return;
                    }
                    *last = std::time::Instant::now();
                    let _ = persist_window_state(&window_for_events, &state_path_for_events);
                }
                tauri::WindowEvent::CloseRequested { .. } => {
                    let _ = persist_window_state(&window_for_events, &state_path_for_events);
                }
                _ => {}
            });
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_markdown_files,
            read_note,
            write_note,
            create_note,
            find_backlinks,
            read_vault_image,
            build_graph,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(serde::Serialize, serde::Deserialize)]
struct WindowState {
    width: f64,
    height: f64,
    x: f64,
    y: f64,
    maximized: bool,
}

fn load_window_state(path: &std::path::Path) -> Result<WindowState, std::io::Error> {
    let raw = std::fs::read_to_string(path)?;
    serde_json::from_str(&raw)
        .map_err(|err| std::io::Error::new(std::io::ErrorKind::InvalidData, err))
}

fn persist_window_state(
    window: &tauri::WebviewWindow,
    path: &std::path::Path,
) -> Result<(), std::io::Error> {
    let maximized = window.is_maximized().unwrap_or(false);
    let size = window.inner_size().map_err(std::io::Error::other)?;
    let position = window.outer_position().map_err(std::io::Error::other)?;
    let scale = window.scale_factor().unwrap_or(1.0);

    let state = WindowState {
        width: size.width as f64 / scale,
        height: size.height as f64 / scale,
        x: position.x as f64 / scale,
        y: position.y as f64 / scale,
        maximized,
    };

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let json = serde_json::to_string(&state)
        .map_err(|err| std::io::Error::new(std::io::ErrorKind::InvalidData, err))?;
    std::fs::write(path, json)
}

use crate::backlinks::find_backlinks_impl;
use crate::graph::{build_graph_impl, GraphData, GraphOptions};
use crate::vault::{
    create_note_impl, list_markdown_files_impl, read_note_impl, read_vault_image_impl,
    write_note_impl, NoteEntry, VaultImage,
};

#[tauri::command(rename = "list-markdown-files")]
async fn list_markdown_files(vault_path: String) -> Result<Vec<NoteEntry>, String> {
    tauri::async_runtime::spawn_blocking(move || list_markdown_files_impl(&vault_path))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command(rename = "read-note")]
async fn read_note(vault_path: String, rel_path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || read_note_impl(&vault_path, &rel_path))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command(rename = "write-note")]
async fn write_note(vault_path: String, rel_path: String, contents: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || write_note_impl(&vault_path, &rel_path, &contents))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command(rename = "create-note")]
async fn create_note(vault_path: String, rel_path: String, contents: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        create_note_impl(&vault_path, &rel_path, &contents)
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command(rename = "find-backlinks")]
async fn find_backlinks(vault_path: String, target_title: String) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || find_backlinks_impl(&vault_path, &target_title))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command(rename = "read-vault-image")]
async fn read_vault_image(vault_path: String, rel_path: String) -> Result<VaultImage, String> {
    tauri::async_runtime::spawn_blocking(move || read_vault_image_impl(&vault_path, &rel_path))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command(rename = "build-graph")]
async fn build_graph(vault_path: String, options: GraphOptions) -> Result<GraphData, String> {
    tauri::async_runtime::spawn_blocking(move || build_graph_impl(&vault_path, options))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}
