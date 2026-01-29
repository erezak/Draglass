use serde::Serialize;
use std::ffi::OsStr;
use std::path::{Component, Path, PathBuf};

#[derive(Debug, Serialize)]
pub struct NoteEntry {
    pub rel_path: String,
    pub display_name: String,
}

#[derive(Debug, Serialize)]
pub struct VaultImage {
    pub bytes: Vec<u8>,
    pub mime: String,
    pub mtime_ms: u64,
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

pub fn list_markdown_files_impl(vault_path: &str) -> Result<Vec<NoteEntry>, String> {
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
