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
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_markdown_files,
            read_note,
            write_note,
            create_note,
            find_backlinks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use serde::Serialize;
use std::ffi::OsStr;
use std::path::{Component, Path, PathBuf};

#[derive(Debug, Serialize)]
struct NoteEntry {
    rel_path: String,
    display_name: String,
}

fn is_markdown_file(path: &Path) -> bool {
    match path.extension().and_then(OsStr::to_str) {
        Some(ext) => {
            let ext = ext.to_ascii_lowercase();
            ext == "md" || ext == "markdown"
        }
        None => false,
    }
}

fn path_to_rel_string(vault: &Path, path: &Path) -> Result<String, String> {
    let rel = path
        .strip_prefix(vault)
        .map_err(|_| "path escapes vault".to_string())?;

    let mut parts: Vec<String> = Vec::new();
    for component in rel.components() {
        match component {
            Component::Normal(p) => parts.push(p.to_string_lossy().to_string()),
            Component::CurDir => {}
            _ => return Err("unsupported path component".to_string()),
        }
    }
    Ok(parts.join("/"))
}

fn display_name_for_path(path: &Path) -> String {
    let name = path
        .file_name()
        .and_then(OsStr::to_str)
        .unwrap_or("(unknown)");

    if let Some(stem) = path.file_stem().and_then(OsStr::to_str) {
        if is_markdown_file(path) {
            return stem.to_string();
        }
    }
    name.to_string()
}

fn collect_markdown_files(
    vault: &Path,
    dir: &Path,
    entries: &mut Vec<NoteEntry>,
) -> Result<(), String> {
    let read_dir = std::fs::read_dir(dir).map_err(|e| format!("failed to read directory: {e}"))?;
    for entry in read_dir {
        let entry = entry.map_err(|e| format!("failed to read entry: {e}"))?;
        let path = entry.path();
        if path.is_dir() {
            collect_markdown_files(vault, &path, entries)?;
            continue;
        }
        if path.is_file() && is_markdown_file(&path) {
            let rel_path = path_to_rel_string(vault, &path)?;
            entries.push(NoteEntry {
                rel_path,
                display_name: display_name_for_path(&path),
            });
        }
    }

    Ok(())
}

fn sanitize_rel_path(rel_path: &str) -> Result<PathBuf, String> {
    let rel = Path::new(rel_path);
    if rel.is_absolute() {
        return Err("absolute paths are not allowed".to_string());
    }

    let mut clean = PathBuf::new();
    for component in rel.components() {
        match component {
            Component::Normal(part) => clean.push(part),
            Component::CurDir => {}
            Component::ParentDir => {
                return Err("parent path components are not allowed".to_string())
            }
            _ => return Err("unsupported path component".to_string()),
        }
    }

    if clean.as_os_str().is_empty() {
        return Err("empty relative path".to_string());
    }
    Ok(clean)
}

fn resolve_existing_note_path(vault_path: &str, rel_path: &str) -> Result<PathBuf, String> {
    let vault =
        std::fs::canonicalize(vault_path).map_err(|e| format!("invalid vault path: {e}"))?;
    if !vault.is_dir() {
        return Err("vault path is not a directory".to_string());
    }

    let rel = sanitize_rel_path(rel_path)?;
    let candidate = vault.join(rel);
    let candidate =
        std::fs::canonicalize(&candidate).map_err(|e| format!("invalid note path: {e}"))?;

    if !candidate.starts_with(&vault) {
        return Err("note path escapes vault".to_string());
    }
    if !candidate.is_file() {
        return Err("note path is not a file".to_string());
    }
    if !is_markdown_file(&candidate) {
        return Err("note is not a markdown file".to_string());
    }

    Ok(candidate)
}

fn resolve_note_path_for_create(vault_path: &str, rel_path: &str) -> Result<PathBuf, String> {
    let vault =
        std::fs::canonicalize(vault_path).map_err(|e| format!("invalid vault path: {e}"))?;
    if !vault.is_dir() {
        return Err("vault path is not a directory".to_string());
    }

    let rel = sanitize_rel_path(rel_path)?;
    let candidate = vault.join(rel);

    if !candidate.starts_with(&vault) {
        return Err("note path escapes vault".to_string());
    }

    if !is_markdown_file(&candidate) {
        return Err("note is not a markdown file".to_string());
    }

    Ok(candidate)
}

fn extract_wikilinks(text: &str) -> Vec<String> {
    let mut links = Vec::new();
    let mut idx = 0;
    while let Some(start) = text[idx..].find("[[") {
        let start = idx + start + 2;
        if let Some(end) = text[start..].find("]]") {
            let end = start + end;
            let raw = &text[start..end];
            let target = raw.split('|').next().unwrap_or("");
            let normalized = normalize_wikilink_target(target);
            if !normalized.is_empty() {
                links.push(normalized);
            }
            idx = end + 2;
        } else {
            break;
        }
    }
    links
}

fn normalize_wikilink_target(target: &str) -> String {
    let trimmed = target.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let mut s = trimmed.to_string();
    if s.to_ascii_lowercase().ends_with(".md") {
        s.truncate(s.len().saturating_sub(3));
    }

    s.to_ascii_lowercase()
}

fn list_markdown_files_impl(vault_path: &str) -> Result<Vec<NoteEntry>, String> {
    let vault =
        std::fs::canonicalize(vault_path).map_err(|e| format!("invalid vault path: {e}"))?;
    if !vault.is_dir() {
        return Err("vault path is not a directory".to_string());
    }

    let mut entries: Vec<NoteEntry> = Vec::new();
    collect_markdown_files(&vault, &vault, &mut entries)?;

    entries.sort_by(|a, b| {
        a.display_name
            .to_lowercase()
            .cmp(&b.display_name.to_lowercase())
    });
    Ok(entries)
}

fn read_note_impl(vault_path: &str, rel_path: &str) -> Result<String, String> {
    let path = resolve_existing_note_path(vault_path, rel_path)?;
    std::fs::read_to_string(path).map_err(|e| format!("failed to read note: {e}"))
}

fn write_note_impl(vault_path: &str, rel_path: &str, contents: &str) -> Result<(), String> {
    let path = resolve_existing_note_path(vault_path, rel_path)?;
    std::fs::write(path, contents).map_err(|e| format!("failed to write note: {e}"))
}

fn create_note_impl(vault_path: &str, rel_path: &str, contents: &str) -> Result<(), String> {
    let path = resolve_note_path_for_create(vault_path, rel_path)?;
    if path.exists() {
        if !path.is_file() {
            return Err("note path is not a file".to_string());
        }
        if !is_markdown_file(&path) {
            return Err("note is not a markdown file".to_string());
        }
        return Err("note already exists".to_string());
    }

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create note folder: {e}"))?;
    }

    std::fs::write(path, contents).map_err(|e| format!("failed to create note: {e}"))
}

fn find_backlinks_impl(vault_path: &str, target_title: &str) -> Result<Vec<String>, String> {
    let files = list_markdown_files_impl(vault_path)?;
    let mut backlinks: Vec<String> = Vec::new();

    let target_title = normalize_wikilink_target(target_title);
    if target_title.is_empty() {
        return Ok(backlinks);
    }

    for file in files {
        let text = match read_note_impl(vault_path, &file.rel_path) {
            Ok(t) => t,
            Err(_) => continue,
        };
        let links = extract_wikilinks(&text);
        if links.iter().any(|l| l == &target_title) {
            backlinks.push(file.rel_path);
        }
    }

    backlinks.sort();
    Ok(backlinks)
}

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
async fn create_note(
    vault_path: String,
    rel_path: String,
    contents: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || create_note_impl(&vault_path, &rel_path, &contents))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}

#[tauri::command(rename = "find-backlinks")]
async fn find_backlinks(vault_path: String, target_title: String) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || find_backlinks_impl(&vault_path, &target_title))
        .await
        .map_err(|e| format!("failed to join task: {e}"))?
}
