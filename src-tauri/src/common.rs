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
use std::sync::OnceLock;

use regex::Regex;

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

/// Check if a path has an Excalidraw extension (`.excalidraw` or `.excalidraw.md`).
pub fn is_excalidraw_file(path: &Path) -> bool {
    let name = path
        .file_name()
        .and_then(OsStr::to_str)
        .unwrap_or("");
    let lower = name.to_ascii_lowercase();
    lower.ends_with(".excalidraw") || lower.ends_with(".excalidraw.md")
}

/// Check if a path is a supported note file (Markdown or Excalidraw).
pub fn is_supported_note_file(path: &Path) -> bool {
    is_markdown_file(path) || is_excalidraw_file(path)
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
/// Handles compound extensions like `.excalidraw.md`.
pub fn display_name_for_path(path: &Path) -> String {
    let name = path
        .file_name()
        .and_then(OsStr::to_str)
        .unwrap_or("(unknown)");
    // Strip compound extension .excalidraw.md first
    if let Some(stem) = name.strip_suffix(".excalidraw.md") {
        if !stem.is_empty() {
            return stem.to_string();
        }
    }
    if let Some(stem) = name.strip_suffix(".excalidraw.MD") {
        if !stem.is_empty() {
            return stem.to_string();
        }
    }
    // Case-insensitive check for .excalidraw.md
    let lower = name.to_ascii_lowercase();
    if lower.ends_with(".excalidraw.md") {
        let stem = &name[..name.len() - ".excalidraw.md".len()];
        if !stem.is_empty() {
            return stem.to_string();
        }
    }
    // Fall back to standard file_stem
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

/// Read a text file with basic BOM support (UTF-8, UTF-16 LE/BE).
pub fn read_text_file(path: &Path) -> Result<String, String> {
    let bytes = std::fs::read(path).map_err(|e| format!("failed to read file: {e}"))?;
    decode_text_bytes(&bytes)
}

fn decode_text_bytes(bytes: &[u8]) -> Result<String, String> {
    const UTF8_BOM: [u8; 3] = [0xEF, 0xBB, 0xBF];
    const UTF16_LE_BOM: [u8; 2] = [0xFF, 0xFE];
    const UTF16_BE_BOM: [u8; 2] = [0xFE, 0xFF];

    if bytes.starts_with(&UTF8_BOM) {
        return std::str::from_utf8(&bytes[3..])
            .map(|s| s.to_string())
            .map_err(|e| format!("invalid UTF-8 text: {e}"));
    }

    if bytes.starts_with(&UTF16_LE_BOM) {
        return decode_utf16(&bytes[2..], true);
    }

    if bytes.starts_with(&UTF16_BE_BOM) {
        return decode_utf16(&bytes[2..], false);
    }

    std::str::from_utf8(bytes)
        .map(|s| s.to_string())
        .map_err(|e| format!("invalid UTF-8 text: {e}"))
}

fn decode_utf16(bytes: &[u8], little_endian: bool) -> Result<String, String> {
    if bytes.len() % 2 != 0 {
        return Err("invalid UTF-16 length".to_string());
    }

    let mut units = Vec::with_capacity(bytes.len() / 2);
    for chunk in bytes.chunks_exact(2) {
        let value = if little_endian {
            u16::from_le_bytes([chunk[0], chunk[1]])
        } else {
            u16::from_be_bytes([chunk[0], chunk[1]])
        };
        units.push(value);
    }

    String::from_utf16(&units).map_err(|e| format!("invalid UTF-16 text: {e}"))
}

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

/// Collect all supported note files (Markdown + Excalidraw) recursively.
/// Returns `(rel_path, absolute_path)` pairs.
pub fn collect_supported_file_paths(
    vault: &Path,
    dir: &Path,
    entries: &mut Vec<(String, std::path::PathBuf)>,
) -> Result<(), String> {
    let read_dir = std::fs::read_dir(dir).map_err(|e| format!("failed to read directory: {e}"))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("failed to read entry: {e}"))?;
        let path = entry.path();

        if path.is_dir() {
            collect_supported_file_paths(vault, &path, entries)?;
            continue;
        }

        if path.is_file() && is_supported_note_file(&path) {
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
// Tag utilities
// ---------------------------------------------------------------------------

fn tag_regex() -> &'static Regex {
    static TAG_RE: OnceLock<Regex> = OnceLock::new();
    TAG_RE.get_or_init(|| {
        Regex::new(r"(^|[^A-Za-z0-9_/])#([A-Za-z0-9][A-Za-z0-9_-]*(?:/[A-Za-z0-9][A-Za-z0-9_-]*)*)")
            .expect("valid tag regex")
    })
}

fn inline_code_regex() -> &'static Regex {
    static INLINE_RE: OnceLock<Regex> = OnceLock::new();
    INLINE_RE.get_or_init(|| Regex::new(r"`[^`]+`").expect("valid inline code regex"))
}

fn fence_regex() -> &'static Regex {
    static FENCE_RE: OnceLock<Regex> = OnceLock::new();
    FENCE_RE.get_or_init(|| Regex::new(r"^\s{0,3}```").expect("valid fence regex"))
}

fn frontmatter_regex() -> &'static Regex {
    static FRONTMATTER_RE: OnceLock<Regex> = OnceLock::new();
    FRONTMATTER_RE.get_or_init(|| {
        Regex::new(r"(?s)\A---\s*\n(.*?)\n---\s*\n?").expect("valid frontmatter regex")
    })
}

fn frontmatter_tags_key_regex() -> &'static Regex {
    static TAGS_KEY_RE: OnceLock<Regex> = OnceLock::new();
    TAGS_KEY_RE.get_or_init(|| {
        Regex::new(r"(?i)^\s*tags\s*:\s*(.*)$").expect("valid frontmatter tags key regex")
    })
}

fn frontmatter_list_item_regex() -> &'static Regex {
    static LIST_ITEM_RE: OnceLock<Regex> = OnceLock::new();
    LIST_ITEM_RE.get_or_init(|| Regex::new(r"^\s*-\s*(.+)$").expect("valid frontmatter list regex"))
}

fn frontmatter_key_regex() -> &'static Regex {
    static KEY_RE: OnceLock<Regex> = OnceLock::new();
    KEY_RE.get_or_init(|| Regex::new(r"^\s*[A-Za-z0-9_-]+\s*:").expect("valid frontmatter key regex"))
}

pub fn normalize_tag(raw: &str) -> String {
    let trimmed = raw.trim();
    let no_hash = trimmed.strip_prefix('#').unwrap_or(trimmed);
    no_hash.trim().to_ascii_lowercase()
}

fn strip_tag_value_quotes(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.len() >= 2
        && ((trimmed.starts_with('"') && trimmed.ends_with('"'))
        || (trimmed.starts_with('\'') && trimmed.ends_with('\''))
    )
    {
        return trimmed[1..trimmed.len().saturating_sub(1)].trim().to_string();
    }
    trimmed.to_string()
}

fn parse_tag_value_into(raw_value: &str, tags: &mut HashSet<String>) {
    let value = strip_tag_value_quotes(raw_value);
    if value.is_empty() {
        return;
    }

    let sequence = if value.len() >= 2 && value.starts_with('[') && value.ends_with(']') {
        value[1..value.len().saturating_sub(1)].to_string()
    } else {
        value
    };

    let parts: Vec<&str> = if sequence.contains(',') {
        sequence.split(',').collect()
    } else {
        vec![sequence.as_str()]
    };

    for part in parts {
        let normalized = normalize_tag(&strip_tag_value_quotes(part));
        if !normalized.is_empty() {
            tags.insert(normalized);
        }
    }
}

fn extract_frontmatter_tags(text: &str) -> Vec<String> {
    let Some(caps) = frontmatter_regex().captures(text) else {
        return Vec::new();
    };
    let raw = caps.get(1).map(|m| m.as_str()).unwrap_or("");

    let mut tags = HashSet::new();
    let mut in_tags_list = false;

    for line in raw.lines() {
        if !in_tags_list {
            let Some(captures) = frontmatter_tags_key_regex().captures(line) else {
                continue;
            };

            let remainder = captures.get(1).map(|m| m.as_str().trim()).unwrap_or("");
            if remainder.is_empty() {
                in_tags_list = true;
            } else {
                parse_tag_value_into(remainder, &mut tags);
            }
            continue;
        }

        if line.trim().is_empty() {
            continue;
        }

        if let Some(item_caps) = frontmatter_list_item_regex().captures(line) {
            let item = item_caps.get(1).map(|m| m.as_str()).unwrap_or("");
            parse_tag_value_into(item, &mut tags);
            continue;
        }

        if frontmatter_key_regex().is_match(line) {
            in_tags_list = false;

            if let Some(captures) = frontmatter_tags_key_regex().captures(line) {
                let remainder = captures.get(1).map(|m| m.as_str().trim()).unwrap_or("");
                if remainder.is_empty() {
                    in_tags_list = true;
                } else {
                    parse_tag_value_into(remainder, &mut tags);
                }
            }
        }
    }

    let mut out: Vec<String> = tags.into_iter().collect();
    out.sort_by(|a, b| a.to_ascii_lowercase().cmp(&b.to_ascii_lowercase()));
    out
}

pub fn extract_tags_with_lock_filter(text: &str, exclude_locked: bool) -> Vec<String> {
    let locked_ranges = if exclude_locked {
        let sections = parse_heading_sections(text);
        get_locked_body_ranges(&sections)
    } else {
        Vec::new()
    };

    let mut tags = HashSet::new();
    for tag in extract_frontmatter_tags(text) {
        tags.insert(tag);
    }
    let mut in_fence = false;

    for (index, line) in text.lines().enumerate() {
        if fence_regex().is_match(line) {
            in_fence = !in_fence;
            continue;
        }
        if in_fence {
            continue;
        }

        let line_number = index + 1;
        if exclude_locked && is_line_in_locked_range(line_number, &locked_ranges) {
            continue;
        }

        let mut code_ranges = Vec::new();
        for m in inline_code_regex().find_iter(line) {
            let from = m.start();
            let to = m.end();
            if to > from {
                code_ranges.push((from, to));
            }
        }

        for caps in tag_regex().captures_iter(line) {
            let tag_match = caps.get(2).map(|m| m.as_str()).unwrap_or("");
            if tag_match.is_empty() {
                continue;
            }

            let tag_range = match caps.get(2) {
                Some(range) => range,
                None => continue,
            };
            let hash_start = tag_range.start().saturating_sub(1);
            let tag_end = tag_range.end();

            let overlaps_code = code_ranges
                .iter()
                .any(|(from, to)| hash_start < *to && tag_end > *from);
            if overlaps_code {
                continue;
            }

            let normalized = normalize_tag(tag_match);
            if !normalized.is_empty() {
                tags.insert(normalized);
            }
        }
    }

    let mut out: Vec<String> = tags.into_iter().collect();
    out.sort_by(|a, b| a.to_ascii_lowercase().cmp(&b.to_ascii_lowercase()));
    out
}

pub fn find_first_inline_tag_line(
    text: &str,
    raw_tag: &str,
    exclude_locked: bool,
) -> Option<usize> {
    let normalized_tag = normalize_tag(raw_tag);
    if normalized_tag.is_empty() {
        return None;
    }

    let locked_ranges = if exclude_locked {
        let sections = parse_heading_sections(text);
        get_locked_body_ranges(&sections)
    } else {
        Vec::new()
    };

    let mut in_fence = false;

    for (index, line) in text.lines().enumerate() {
        if fence_regex().is_match(line) {
            in_fence = !in_fence;
            continue;
        }
        if in_fence {
            continue;
        }

        let line_number = index + 1;
        if exclude_locked && is_line_in_locked_range(line_number, &locked_ranges) {
            continue;
        }

        let mut code_ranges = Vec::new();
        for m in inline_code_regex().find_iter(line) {
            let from = m.start();
            let to = m.end();
            if to > from {
                code_ranges.push((from, to));
            }
        }

        for caps in tag_regex().captures_iter(line) {
            let tag_match = caps.get(2).map(|m| m.as_str()).unwrap_or("");
            if normalize_tag(tag_match) != normalized_tag {
                continue;
            }

            let Some(tag_range) = caps.get(2) else {
                continue;
            };
            let hash_start = tag_range.start().saturating_sub(1);
            let tag_end = tag_range.end();

            let overlaps_code = code_ranges
                .iter()
                .any(|(from, to)| hash_start < *to && tag_end > *from);
            if overlaps_code {
                continue;
            }

            return Some(line_number);
        }
    }

    None
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

    #[test]
    fn excalidraw_file_detection() {
        assert!(is_excalidraw_file(Path::new("drawing.excalidraw")));
        assert!(is_excalidraw_file(Path::new("Drawing.EXCALIDRAW")));
        assert!(is_excalidraw_file(Path::new("drawing.excalidraw.md")));
        assert!(is_excalidraw_file(Path::new("Drawing.EXCALIDRAW.MD")));
        assert!(!is_excalidraw_file(Path::new("note.md")));
        assert!(!is_excalidraw_file(Path::new("note.txt")));
    }

    #[test]
    fn supported_note_file_detection() {
        assert!(is_supported_note_file(Path::new("note.md")));
        assert!(is_supported_note_file(Path::new("note.markdown")));
        assert!(is_supported_note_file(Path::new("drawing.excalidraw")));
        assert!(!is_supported_note_file(Path::new("image.png")));
        assert!(!is_supported_note_file(Path::new("data.json")));
    }

    #[test]
    fn decode_utf8_with_bom() {
        let bytes = [0xEF, 0xBB, 0xBF, b'a', b'b'];
        let text = decode_text_bytes(&bytes).expect("decode utf8 bom");
        assert_eq!(text, "ab");
    }

    #[test]
    fn decode_utf16_le_with_bom() {
        let bytes = [0xFF, 0xFE, b'a', 0x00, b'b', 0x00];
        let text = decode_text_bytes(&bytes).expect("decode utf16 le");
        assert_eq!(text, "ab");
    }

    #[test]
    fn decode_utf16_be_with_bom() {
        let bytes = [0xFE, 0xFF, 0x00, b'a', 0x00, b'b'];
        let text = decode_text_bytes(&bytes).expect("decode utf16 be");
        assert_eq!(text, "ab");
    }

    #[test]
    fn normalize_tag_values() {
        assert_eq!(normalize_tag("#Tag/Sub"), "tag/sub");
        assert_eq!(normalize_tag("  MixedCase  "), "mixedcase");
        assert_eq!(normalize_tag(""), "");
    }

    #[test]
    fn extract_tags_filters_code_fence_and_locked_ranges() {
        let text = [
            "---",
            "tags: [frontmatter_one, frontmatter/two]",
            "---",
            "Top #alpha and #beta/sub",
            "Inline `#skip_inline`",
            "abc#skip_boundary",
            "```md",
            "#skip_fence",
            "```",
            "## Private {locked}",
            "Hidden #secret",
            "## Public",
            "Visible #open",
        ]
        .join("\n");

        let all = extract_tags_with_lock_filter(&text, false);
        assert!(all.contains(&"alpha".to_string()));
        assert!(all.contains(&"beta/sub".to_string()));
        assert!(all.contains(&"frontmatter_one".to_string()));
        assert!(all.contains(&"frontmatter/two".to_string()));
        assert!(all.contains(&"secret".to_string()));
        assert!(all.contains(&"open".to_string()));
        assert!(!all.contains(&"skip_inline".to_string()));
        assert!(!all.contains(&"skip_fence".to_string()));
        assert!(!all.contains(&"skip_boundary".to_string()));

        let public_only = extract_tags_with_lock_filter(&text, true);
        assert!(public_only.contains(&"alpha".to_string()));
        assert!(public_only.contains(&"beta/sub".to_string()));
        assert!(public_only.contains(&"frontmatter_one".to_string()));
        assert!(public_only.contains(&"open".to_string()));
        assert!(!public_only.contains(&"secret".to_string()));
    }

    #[test]
    fn find_first_inline_tag_line_handles_locked_and_code() {
        let text = [
            "Top #alpha",
            "Inline `#skip_inline`",
            "```",
            "#skip_fence",
            "```",
            "## Private {locked}",
            "Hidden #secret",
            "## Public",
            "Visible #open",
        ]
        .join("\n");

        assert_eq!(find_first_inline_tag_line(&text, "alpha", false), Some(1));
        assert_eq!(find_first_inline_tag_line(&text, "secret", true), None);
        assert_eq!(find_first_inline_tag_line(&text, "open", true), Some(9));
    }
}
