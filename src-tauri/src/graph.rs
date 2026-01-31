use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::ffi::OsStr;
use std::path::{Component, Path};
use std::time::UNIX_EPOCH;

/// A node in the graph representing a note.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphNode {
    /// Stable identifier - normalized relative path without .md
    pub id: String,
    /// Display name (filename without extension)
    pub title: String,
    /// Relative path including folders
    pub rel_path: String,
    /// Whether this file matches ignore rules
    pub is_hidden: bool,
    /// Number of incoming links (backlinks count)
    pub degree_in: u32,
    /// Number of outgoing links
    pub degree_out: u32,
    /// File creation timestamp in milliseconds (best effort, null if unavailable)
    pub created_at: Option<u64>,
    /// File modification timestamp in milliseconds
    pub modified_at: Option<u64>,
}

/// An edge in the graph representing a link between notes.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    /// Source node id
    pub source_id: String,
    /// Target node id (will match a node if resolved)
    pub target_id: String,
    /// Number of times source links to target
    pub count: u32,
}

/// Complete graph data returned to frontend.
#[derive(Debug, Serialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

/// Options for building the graph.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphOptions {
    pub show_hidden: bool,
}

/// Check if a path segment represents a hidden/ignored item.
fn is_hidden_segment(segment: &str) -> bool {
    let lower = segment.to_ascii_lowercase();
    // Dotfiles/dotfolders
    if lower.starts_with('.') {
        return true;
    }
    // Common junk folders
    if lower == "node_modules" {
        return true;
    }
    false
}

/// Check if a relative path is hidden based on any segment.
fn is_hidden_path(rel_path: &str) -> bool {
    for segment in rel_path.split('/') {
        if segment.is_empty() {
            continue;
        }
        if is_hidden_segment(segment) {
            return true;
        }
    }
    false
}

/// Check if a path is a Markdown file.
fn is_markdown_file(path: &Path) -> bool {
    match path.extension().and_then(OsStr::to_str) {
        Some(ext) => {
            let ext = ext.to_ascii_lowercase();
            ext == "md" || ext == "markdown"
        }
        None => false,
    }
}

/// Convert a path to a relative string.
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

/// Get the display name (stem) from a path.
fn display_name_for_path(path: &Path) -> String {
    path.file_stem()
        .and_then(OsStr::to_str)
        .unwrap_or("(unknown)")
        .to_string()
}

/// Normalize a wikilink target for matching.
/// Rules: trim outer spaces, strip alias after |, case-insensitive, drop .md
fn normalize_wikilink_target(target: &str) -> String {
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

/// Extract wikilinks from note text.
fn extract_wikilinks(text: &str) -> Vec<String> {
    let mut links = Vec::new();
    let mut seen = HashSet::new();
    let mut idx = 0;

    while let Some(start) = text[idx..].find("[[") {
        let start = idx + start + 2;
        if let Some(end) = text[start..].find("]]") {
            let end = start + end;
            let raw = &text[start..end];
            let normalized = normalize_wikilink_target(raw);
            if !normalized.is_empty() && seen.insert(normalized.clone()) {
                links.push(normalized);
            }
            idx = end + 2;
        } else {
            break;
        }
    }
    links
}

/// Collect Markdown files recursively from a directory.
fn collect_markdown_files(
    vault: &Path,
    dir: &Path,
    entries: &mut Vec<(String, std::path::PathBuf)>,
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
            entries.push((rel_path, path));
        }
    }

    Ok(())
}

/// Build the graph from a vault.
pub fn build_graph_impl(vault_path: &str, options: GraphOptions) -> Result<GraphData, String> {
    let vault =
        std::fs::canonicalize(vault_path).map_err(|e| format!("invalid vault path: {e}"))?;
    if !vault.is_dir() {
        return Err("vault path is not a directory".to_string());
    }

    // Collect all markdown files
    let mut file_entries: Vec<(String, std::path::PathBuf)> = Vec::new();
    collect_markdown_files(&vault, &vault, &mut file_entries)?;

    // Build mapping from normalized filename stem to rel_path for resolution
    // Key: lowercase filename without extension, Value: rel_path
    let mut stem_to_rel_path: HashMap<String, String> = HashMap::new();
    for (rel_path, _) in &file_entries {
        let stem = rel_path
            .rsplit('/')
            .next()
            .unwrap_or(rel_path)
            .trim_end_matches(".md")
            .trim_end_matches(".markdown")
            .to_ascii_lowercase();
        // First match wins for duplicate stems
        stem_to_rel_path
            .entry(stem)
            .or_insert_with(|| rel_path.clone());
    }

    // Also map full rel_path (without extension) for path-based links
    for (rel_path, _) in &file_entries {
        let without_ext = rel_path
            .trim_end_matches(".md")
            .trim_end_matches(".markdown")
            .to_ascii_lowercase();
        stem_to_rel_path
            .entry(without_ext)
            .or_insert_with(|| rel_path.clone());
    }

    // Track in-degree for each node
    let mut in_degree: HashMap<String, u32> = HashMap::new();
    // Track out-degree for each node
    let mut out_degree: HashMap<String, u32> = HashMap::new();
    // Edges: (source_rel_path, target_rel_path) -> count
    let mut edge_counts: HashMap<(String, String), u32> = HashMap::new();

    // Process each file to extract links
    for (rel_path, path) in &file_entries {
        let is_hidden = is_hidden_path(rel_path);

        // Skip hidden files if not showing hidden
        if is_hidden && !options.show_hidden {
            continue;
        }

        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let links = extract_wikilinks(&content);
        out_degree.insert(rel_path.clone(), links.len() as u32);

        for link in links {
            // Try to resolve the link to an existing file
            if let Some(target_rel_path) = stem_to_rel_path.get(&link) {
                let target_hidden = is_hidden_path(target_rel_path);

                // Skip edges to hidden targets if not showing hidden
                if target_hidden && !options.show_hidden {
                    continue;
                }

                // Increment in-degree
                *in_degree.entry(target_rel_path.clone()).or_insert(0) += 1;

                // Track edge
                let key = (rel_path.clone(), target_rel_path.clone());
                *edge_counts.entry(key).or_insert(0) += 1;
            }
        }
    }

    // Build nodes
    let mut nodes: Vec<GraphNode> = Vec::new();
    for (rel_path, path) in &file_entries {
        let is_hidden = is_hidden_path(rel_path);

        // Skip hidden files unless showing hidden
        if is_hidden && !options.show_hidden {
            continue;
        }

        let title = display_name_for_path(path);
        let id = rel_path
            .trim_end_matches(".md")
            .trim_end_matches(".markdown")
            .to_ascii_lowercase();

        // Get file metadata for timestamps
        let (created_at, modified_at) = match std::fs::metadata(path) {
            Ok(meta) => {
                let modified = meta
                    .modified()
                    .ok()
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_millis() as u64);

                // macOS supports created time, other platforms may not
                #[cfg(target_os = "macos")]
                let created = meta
                    .created()
                    .ok()
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_millis() as u64);

                #[cfg(not(target_os = "macos"))]
                let created = None;

                (created, modified)
            }
            Err(_) => (None, None),
        };

        nodes.push(GraphNode {
            id,
            title,
            rel_path: rel_path.clone(),
            is_hidden,
            degree_in: *in_degree.get(rel_path).unwrap_or(&0),
            degree_out: *out_degree.get(rel_path).unwrap_or(&0),
            created_at,
            modified_at,
        });
    }

    // Build edges
    let edges: Vec<GraphEdge> = edge_counts
        .into_iter()
        .map(|((source_rel_path, target_rel_path), count)| {
            let source_id = source_rel_path
                .trim_end_matches(".md")
                .trim_end_matches(".markdown")
                .to_ascii_lowercase();
            let target_id = target_rel_path
                .trim_end_matches(".md")
                .trim_end_matches(".markdown")
                .to_ascii_lowercase();
            GraphEdge {
                source_id,
                target_id,
                count,
            }
        })
        .collect();

    // Sort nodes by title for consistent ordering
    let mut sorted_nodes = nodes;
    sorted_nodes.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));

    Ok(GraphData {
        nodes: sorted_nodes,
        edges,
    })
}

#[cfg(test)]
mod tests {
    use super::{extract_wikilinks, is_hidden_path, normalize_wikilink_target};

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
        let links = extract_wikilinks("[[Foo]] [[ foo ]] [[FOO|bar]]");
        assert_eq!(links, vec!["foo".to_string()]);

        let links2 = extract_wikilinks("See [[Note A]] and [[Note B]].");
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
}
