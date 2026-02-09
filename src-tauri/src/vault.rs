use serde::Serialize;
use std::ffi::OsStr;
use std::path::{Component, Path, PathBuf};

use crate::common::{
    collect_markdown_file_paths, collect_supported_file_paths,
    is_hidden_path, is_markdown_file, is_supported_note_file,
};

#[derive(Debug, Serialize)]
pub struct NoteEntry {
    pub rel_path: String,
    pub display_name: String,
}

#[derive(Debug, Serialize)]
pub struct SearchHit {
    pub rel_path: String,
    pub line_number: usize, // 1-based
    pub offset: usize,      // 0-based offset in line
    pub snippet: String,
}

#[derive(Debug, Serialize)]
pub struct VaultImage {
    pub bytes: Vec<u8>,
    pub mime: String,
    pub mtime_ms: u64,
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
    if !is_supported_note_file(&candidate) {
        return Err("note is not a supported file type".to_string());
    }

    Ok(candidate)
}

fn resolve_existing_asset_path(vault_path: &str, rel_path: &str) -> Result<PathBuf, String> {
    let vault =
        std::fs::canonicalize(vault_path).map_err(|e| format!("invalid vault path: {e}"))?;
    if !vault.is_dir() {
        return Err("vault path is not a directory".to_string());
    }

    let rel = sanitize_rel_path(rel_path)?;
    let candidate = vault.join(rel);
    let candidate =
        std::fs::canonicalize(&candidate).map_err(|e| format!("invalid asset path: {e}"))?;

    if !candidate.starts_with(&vault) {
        return Err("asset path escapes vault".to_string());
    }
    if !candidate.is_file() {
        return Err("asset path is not a file".to_string());
    }

    Ok(candidate)
}

fn mime_for_path(path: &Path) -> String {
    let ext = path
        .extension()
        .and_then(OsStr::to_str)
        .unwrap_or("")
        .to_ascii_lowercase();
    match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "avif" => "image/avif",
        "bmp" => "image/bmp",
        "tif" | "tiff" => "image/tiff",
        _ => "application/octet-stream",
    }
    .to_string()
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

fn resolve_folder_path_for_create(vault_path: &str, rel_path: &str) -> Result<PathBuf, String> {
    let vault =
        std::fs::canonicalize(vault_path).map_err(|e| format!("invalid vault path: {e}"))?;
    if !vault.is_dir() {
        return Err("vault path is not a directory".to_string());
    }

    let rel = sanitize_rel_path(rel_path)?;
    let candidate = vault.join(rel);

    if !candidate.starts_with(&vault) {
        return Err("folder path escapes vault".to_string());
    }

    Ok(candidate)
}

pub fn list_markdown_files_impl(vault_path: &str) -> Result<Vec<NoteEntry>, String> {
    let vault =
        std::fs::canonicalize(vault_path).map_err(|e| format!("invalid vault path: {e}"))?;
    if !vault.is_dir() {
        return Err("vault path is not a directory".to_string());
    }

    let mut file_paths: Vec<(String, PathBuf)> = Vec::new();
    collect_supported_file_paths(&vault, &vault, &mut file_paths)?;

    let mut entries: Vec<NoteEntry> = file_paths
        .into_iter()
        .map(|(rel_path, path)| NoteEntry {
            display_name: display_name_for_path(&path),
            rel_path,
        })
        .collect();

    entries.sort_by(|a, b| {
        a.display_name
            .to_lowercase()
            .cmp(&b.display_name.to_lowercase())
    });
    Ok(entries)
}

pub fn read_note_impl(vault_path: &str, rel_path: &str) -> Result<String, String> {
    let path = resolve_existing_note_path(vault_path, rel_path)?;
    std::fs::read_to_string(path).map_err(|e| format!("failed to read note: {e}"))
}

pub fn write_note_impl(vault_path: &str, rel_path: &str, contents: &str) -> Result<(), String> {
    let path = resolve_existing_note_path(vault_path, rel_path)?;
    std::fs::write(path, contents).map_err(|e| format!("failed to write note: {e}"))
}

pub fn create_note_impl(vault_path: &str, rel_path: &str, contents: &str) -> Result<(), String> {
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

pub fn rename_note_impl(
    vault_path: &str,
    from_rel_path: &str,
    to_rel_path: &str,
) -> Result<(), String> {
    let from = resolve_existing_note_path(vault_path, from_rel_path)?;
    let to = resolve_note_path_for_create(vault_path, to_rel_path)?;

    if from == to {
        return Ok(());
    }

    if to.exists() {
        return Err("note already exists".to_string());
    }

    if let Some(parent) = to.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create note folder: {e}"))?;
    }

    std::fs::rename(&from, &to).map_err(|e| format!("failed to rename note: {e}"))
}

pub fn delete_note_impl(vault_path: &str, rel_path: &str) -> Result<(), String> {
    let path = resolve_existing_note_path(vault_path, rel_path)?;
    std::fs::remove_file(path).map_err(|e| format!("failed to delete note: {e}"))
}

pub fn create_dir_impl(vault_path: &str, rel_path: &str) -> Result<(), String> {
    let path = resolve_folder_path_for_create(vault_path, rel_path)?;
    if path.exists() {
        if path.is_dir() {
            return Err("folder already exists".to_string());
        }
        return Err("folder path is not a directory".to_string());
    }

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create folder parent: {e}"))?;
    }

    std::fs::create_dir(&path).map_err(|e| format!("failed to create folder: {e}"))
}

pub fn read_vault_image_impl(vault_path: &str, rel_path: &str) -> Result<VaultImage, String> {
    let path = resolve_existing_asset_path(vault_path, rel_path)?;
    let bytes = std::fs::read(&path).map_err(|e| format!("failed to read asset: {e}"))?;
    let metadata = std::fs::metadata(&path).map_err(|e| format!("failed to read metadata: {e}"))?;
    let modified = metadata
        .modified()
        .map_err(|e| format!("failed to read modified time: {e}"))?;
    let mtime_ms = modified
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("invalid modified time: {e}"))?
        .as_millis() as u64;

    Ok(VaultImage {
        bytes,
        mime: mime_for_path(&path),
        mtime_ms,
    })
}

pub fn search_vault_impl(
    vault_path: &str,
    query: &str,
    case_sensitive: bool,
    exclude_locked: bool,
    show_hidden: bool,
) -> Result<Vec<SearchHit>, String> {
    if query.is_empty() {
        return Ok(Vec::new());
    }

    let vault = std::fs::canonicalize(vault_path).map_err(|e| format!("invalid vault path: {e}"))?;
    if !vault.is_dir() {
        return Err("vault path is not a directory".to_string());
    }

    let mut hits = Vec::new();
    let query_lower = if !case_sensitive {
        Some(query.to_lowercase())
    } else {
        None
    };

    let mut file_paths: Vec<(String, PathBuf)> = Vec::new();
    collect_markdown_file_paths(&vault, &vault, &mut file_paths)?;

    for (rel_path_str, _) in file_paths {
        if !show_hidden && is_hidden_path(&rel_path_str) {
            continue;
        }

        let full_path = vault.join(Path::new(&rel_path_str));
        let content = match std::fs::read_to_string(&full_path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let locked_ranges = if exclude_locked {
            let sections = crate::locked_sections::parse_heading_sections(&content);
            Some(crate::locked_sections::get_locked_body_ranges(&sections))
        } else {
            None
        };

        for (i, line) in content.lines().enumerate() {
            let line_number = i + 1;

            if let Some(ref ranges) = locked_ranges {
                if crate::locked_sections::is_line_in_locked_range(line_number, ranges) {
                    continue;
                }
            }

            let (search_line, target_query) = if let Some(ref q_lower) = query_lower {
                (line.to_lowercase(), q_lower.as_str())
            } else {
                (line.to_string(), query)
            };

            let mut start = 0;
            while let Some(pos) = search_line[start..].find(target_query) {
                let actual_pos = start + pos;
                hits.push(SearchHit {
                    rel_path: rel_path_str.clone(),
                    line_number,
                    offset: actual_pos,
                    snippet: line.to_string(),
                });
                start = actual_pos + target_query.len();
                if start >= search_line.len() {
                    break;
                }
            }
        }
    }

    Ok(hits)
}
