//! Shared utilities used across vault, backlinks, and graph modules.
//!
//! This module exists to eliminate code duplication: functions like
//! `is_markdown_file`, `path_to_rel_string`, `collect_markdown_files`,
//! `normalize_wikilink_target`, and `extract_wikilinks_with_lock_filter`
//! were previously copy-pasted across multiple modules. Centralising
//! them here makes the codebase easier to maintain and test.

use std::collections::HashSet;
use std::ffi::OsStr;
use std::path::{Component, Path};

use crate::locked_sections::{get_locked_body_ranges, is_line_in_locked_range, parse_heading_sections};

// ---------------------------------------------------------------------------
// Path utilities
// ---------------------------------------------------------------------------

/// Check if a path has a Markdown extension (`.md` or `.markdown`).
pub fn is_markdown_file(path: &Path) -> bool {
    match path.extension().and_then(OsStr::to_str) {
        Some(ext) => {
            let ext = ext.to_ascii_lowercase();
            ext == "md" || ext == "markdown"
        }
        None => false,
    }
}

/// Convert an absolute path to a forward-slash relative string within a vault.
pub fn path_to_rel_string(vault: &Path, path: &Path) -> Result<String, String> {
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

/// Get the display name (filename stem) from a path.
pub fn display_name_for_path(path: &Path) -> String {
    path.file_stem()
        .and_then(OsStr::to_str)
        .unwrap_or("(unknown)")
        .to_string()
}

/// Check if a path segment represents a hidden/ignored item (dotfiles, node_modules).
fn is_hidden_segment(segment: &str) -> bool {
    let lower = segment.to_ascii_lowercase();
    lower.starts_with('.') || lower == "node_modules"
}

/// Check if a relative path is hidden based on any path segment.
pub fn is_hidden_path(rel_path: &str) -> bool {
    rel_path.split('/').any(|s| !s.is_empty() && is_hidden_segment(s))
}

// ---------------------------------------------------------------------------
// File collection
// ---------------------------------------------------------------------------

/// Collect all Markdown file paths recursively from a directory.
/// Returns `(rel_path, absolute_path)` pairs.
pub fn collect_markdown_file_paths(
    vault: &Path,
    dir: &Path,
    entries: &mut Vec<(String, std::path::PathBuf)>,
) -> Result<(), String> {
    let read_dir = std::fs::read_dir(dir).map_err(|e| format!("failed to read directory: {e}"))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("failed to read entry: {e}"))?;
        let path = entry.path();

        if path.is_dir() {
            collect_markdown_file_paths(vault, &path, entries)?;
            continue;
        }

        if path.is_file() && is_markdown_file(&path) {
            let rel_path = path_to_rel_string(vault, &path)?;
            entries.push((rel_path, path));
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Wikilink utilities
// ---------------------------------------------------------------------------

/// Normalize a wikilink target for matching.
///
/// Rules: trim whitespace, strip display alias after `|`, strip trailing `.md`,
/// convert to lowercase for case-insensitive matching.
pub fn normalize_wikilink_target(target: &str) -> String {
    let raw = target.split('|').next().unwrap_or("");
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let mut s = trimmed.to_string();
    if s.to_ascii_lowercase().ends_with(".md") {
        s.truncate(s.len().saturating_sub(3));
    }

    s.to_ascii_lowercase()
}

/// Extract wikilinks from note text, optionally excluding those inside locked sections.
pub fn extract_wikilinks_with_lock_filter(text: &str, exclude_locked: bool) -> Vec<String> {
    let locked_ranges = if exclude_locked {
        let sections = parse_heading_sections(text);
        get_locked_body_ranges(&sections)
    } else {
        Vec::new()
    };

    // Build line-start offsets for byte-offset → line-number conversion.
    let mut line_starts: Vec<usize> = vec![0];
    for (i, ch) in text.char_indices() {
        if ch == '\n' {
            line_starts.push(i + 1);
        }
    }

    let offset_to_line = |offset: usize| -> usize {
        match line_starts.binary_search(&offset) {
            Ok(i) => i + 1,
            Err(i) => i,
        }
    };

    let mut links = Vec::new();
    let mut seen = HashSet::new();
    let mut idx = 0;

    while let Some(start) = text[idx..].find("[[") {
        let abs_start = idx + start;
        let content_start = abs_start + 2;
        if let Some(end) = text[content_start..].find("]]") {
            let content_end = content_start + end;
            let raw = &text[content_start..content_end];
            let normalized = normalize_wikilink_target(raw);

            if !normalized.is_empty() {
                let line_num = offset_to_line(abs_start);
                let in_locked = exclude_locked && is_line_in_locked_range(line_num, &locked_ranges);

                if !in_locked && seen.insert(normalized.clone()) {
                    links.push(normalized);
                }
            }
            idx = content_end + 2;
        } else {
            break;
        }
    }
    links
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_targets() {
        assert_eq!(normalize_wikilink_target("  Note Name  "), "note name");
        assert_eq!(normalize_wikilink_target(" Note | Alias "), "note");
        assert_eq!(normalize_wikilink_target("Foo.md"), "foo");
        assert_eq!(normalize_wikilink_target("Foo.MD"), "foo");
        assert_eq!(normalize_wikilink_target(""), "");
        assert_eq!(normalize_wikilink_target("folder/Note"), "folder/note");
    }

    #[test]
    fn extract_links() {
        let links = extract_wikilinks_with_lock_filter("[[Foo]] [[ foo ]] [[FOO|bar]]", false);
        assert_eq!(links, vec!["foo".to_string()]);

        let links2 = extract_wikilinks_with_lock_filter("See [[Note A]] and [[Note B]].", false);
        assert_eq!(links2, vec!["note a".to_string(), "note b".to_string()]);
    }

    #[test]
    fn hidden_paths() {
        assert!(is_hidden_path(".hidden/file.md"));
        assert!(is_hidden_path("folder/.git/config"));
        assert!(is_hidden_path("node_modules/package/file.md"));
        assert!(!is_hidden_path("regular/folder/note.md"));
        assert!(!is_hidden_path("notes/my-note.md"));
    }

    #[test]
    fn markdown_file_detection() {
        assert!(is_markdown_file(Path::new("note.md")));
        assert!(is_markdown_file(Path::new("note.markdown")));
        assert!(is_markdown_file(Path::new("NOTE.MD")));
        assert!(!is_markdown_file(Path::new("note.txt")));
        assert!(!is_markdown_file(Path::new("note")));
    }
}
