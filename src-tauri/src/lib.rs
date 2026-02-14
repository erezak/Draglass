use tauri::Manager;

mod auth;
mod backlinks;
mod common;
mod demo_vault;
mod graph;
mod locked_sections;
mod vault;
mod vault_index;

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
            rename_note,
            delete_note,
            create_dir,
            find_backlinks,
            read_vault_image,
            build_graph,
            search_vault,
            search_v2,
            index_status,
            rebuild_index,
            upsert_note,
            remove_note,
            cancel_request,
            find_backlinks_v2,
            build_graph_v2,
            list_tasks_v2,
            list_tags,
            notes_for_tag,
            start_index_watcher,
            stop_index_watcher,
            hash_vault_password,
            verify_vault_password,
            get_demo_vault_path,
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

use crate::auth::{hash_password_impl, verify_password_impl, HashResult};
use crate::backlinks::find_backlinks_impl;
use crate::demo_vault::get_demo_vault_path_impl;
use crate::graph::{build_graph_impl, GraphData, GraphOptions};
use crate::vault::{
    create_dir_impl, create_note_impl, delete_note_impl, list_markdown_files_impl,
    read_note_impl, read_vault_image_impl, rename_note_impl, search_vault_impl, write_note_impl,
    NoteEntry, SearchHit, VaultImage,
};
use crate::vault_index::{
    build_graph_v2_impl, cancel_request_impl, find_backlinks_v2_impl, index_status_impl,
    list_tags_impl, list_tasks_v2_impl, notes_for_tag_impl, rebuild_index_impl,
    remove_note_impl as remove_note_from_index_impl, search_v2_impl,
    upsert_note_impl as upsert_note_index_impl, CancelResult, IndexStatus, MutationResult,
    RebuildOptions, RebuildResult, RemoveResult, SearchFlags, SearchResponse, TagNote, TagSummary,
    TaskItem, WatcherResult, WatcherStopResult, start_index_watcher_impl, stop_index_watcher_impl,
};

#[tauri::command]
async fn list_markdown_files(vault_path: String) -> Result<Vec<NoteEntry>, String> {
    tauri::async_runtime::spawn_blocking(move || list_markdown_files_impl(&vault_path))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn read_note(vault_path: String, rel_path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || read_note_impl(&vault_path, &rel_path))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn write_note(
    app_handle: tauri::AppHandle,
    vault_path: String,
    rel_path: String,
    contents: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        write_note_impl(&vault_path, &rel_path, &contents)?;
        let _ = upsert_note_index_impl(
            &app_handle,
            &vault_path,
            &rel_path,
            Some(contents),
            None,
            None,
        );
        Ok(())
    })
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn create_note(
    app_handle: tauri::AppHandle,
    vault_path: String,
    rel_path: String,
    contents: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        create_note_impl(&vault_path, &rel_path, &contents)?;
        let _ = upsert_note_index_impl(
            &app_handle,
            &vault_path,
            &rel_path,
            Some(contents),
            None,
            None,
        );
        Ok(())
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn rename_note(
    app_handle: tauri::AppHandle,
    vault_path: String,
    from_rel_path: String,
    to_rel_path: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        rename_note_impl(&vault_path, &from_rel_path, &to_rel_path)?;
        let _ = remove_note_from_index_impl(&app_handle, &vault_path, &from_rel_path);
        let _ = upsert_note_index_impl(&app_handle, &vault_path, &to_rel_path, None, None, None);
        Ok(())
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn delete_note(
    app_handle: tauri::AppHandle,
    vault_path: String,
    rel_path: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        delete_note_impl(&vault_path, &rel_path)?;
        let _ = remove_note_from_index_impl(&app_handle, &vault_path, &rel_path);
        Ok(())
    })
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn create_dir(vault_path: String, rel_path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || create_dir_impl(&vault_path, &rel_path))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn find_backlinks(
    vault_path: String,
    target_title: String,
    exclude_locked: bool,
) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        find_backlinks_impl(&vault_path, &target_title, exclude_locked)
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn read_vault_image(vault_path: String, rel_path: String) -> Result<VaultImage, String> {
    tauri::async_runtime::spawn_blocking(move || read_vault_image_impl(&vault_path, &rel_path))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn search_vault(
    vault_path: String,
    query: String,
    case_sensitive: bool,
    exclude_locked: bool,
    show_hidden: bool,
) -> Result<Vec<SearchHit>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        search_vault_impl(&vault_path, &query, case_sensitive, exclude_locked, show_hidden)
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn search_v2(
    app_handle: tauri::AppHandle,
    vault_path: String,
    query: String,
    flags: SearchFlags,
    limit: usize,
    offset: usize,
    request_token: Option<String>,
) -> Result<SearchResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        search_v2_impl(
            &app_handle,
            &vault_path,
            &query,
            flags,
            limit,
            offset,
            request_token,
        )
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn index_status(
    app_handle: tauri::AppHandle,
    vault_path: String,
) -> Result<IndexStatus, String> {
    tauri::async_runtime::spawn_blocking(move || index_status_impl(&app_handle, &vault_path))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn rebuild_index(
    app_handle: tauri::AppHandle,
    vault_path: String,
    options: RebuildOptions,
) -> Result<RebuildResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        rebuild_index_impl(&app_handle, &vault_path, options)
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn upsert_note(
    app_handle: tauri::AppHandle,
    vault_path: String,
    rel_path: String,
    text: Option<String>,
    mtime_ms: Option<u64>,
    size_bytes: Option<u64>,
) -> Result<MutationResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        upsert_note_index_impl(
            &app_handle,
            &vault_path,
            &rel_path,
            text,
            mtime_ms,
            size_bytes,
        )
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn remove_note(
    app_handle: tauri::AppHandle,
    vault_path: String,
    rel_path: String,
) -> Result<RemoveResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        remove_note_from_index_impl(&app_handle, &vault_path, &rel_path)
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn cancel_request(request_token: String) -> Result<CancelResult, String> {
    tauri::async_runtime::spawn_blocking(move || cancel_request_impl(&request_token))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn find_backlinks_v2(
    app_handle: tauri::AppHandle,
    vault_path: String,
    target_title: String,
    include_locked: bool,
    show_hidden: bool,
) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        find_backlinks_v2_impl(
            &app_handle,
            &vault_path,
            &target_title,
            include_locked,
            show_hidden,
        )
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn build_graph_v2(
    app_handle: tauri::AppHandle,
    vault_path: String,
    options: GraphOptions,
) -> Result<GraphData, String> {
    tauri::async_runtime::spawn_blocking(move || {
        build_graph_v2_impl(&app_handle, &vault_path, options)
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn list_tasks_v2(
    app_handle: tauri::AppHandle,
    vault_path: String,
    show_hidden: bool,
    include_locked: bool,
) -> Result<Vec<TaskItem>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        list_tasks_v2_impl(&app_handle, &vault_path, show_hidden, include_locked)
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn list_tags(
    app_handle: tauri::AppHandle,
    vault_path: String,
    show_hidden: bool,
    include_locked: bool,
) -> Result<Vec<TagSummary>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        list_tags_impl(&app_handle, &vault_path, show_hidden, include_locked)
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn notes_for_tag(
    app_handle: tauri::AppHandle,
    vault_path: String,
    tag: String,
    show_hidden: bool,
    include_locked: bool,
) -> Result<Vec<TagNote>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        notes_for_tag_impl(&app_handle, &vault_path, &tag, show_hidden, include_locked)
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn start_index_watcher(
    app_handle: tauri::AppHandle,
    vault_path: String,
) -> Result<WatcherResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        start_index_watcher_impl(&app_handle, &vault_path)
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn stop_index_watcher(vault_path: String) -> Result<WatcherStopResult, String> {
    tauri::async_runtime::spawn_blocking(move || stop_index_watcher_impl(&vault_path))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn build_graph(vault_path: String, options: GraphOptions) -> Result<GraphData, String> {
    tauri::async_runtime::spawn_blocking(move || build_graph_impl(&vault_path, options))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn hash_vault_password(password: String, salt: Option<String>) -> Result<HashResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        hash_password_impl(&password, salt.as_deref())
    })
    .await
    .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn verify_vault_password(password: String, hash: String) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || verify_password_impl(&password, &hash))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command]
async fn get_demo_vault_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || get_demo_vault_path_impl(&app_handle))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}
