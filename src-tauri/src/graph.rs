use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::UNIX_EPOCH;

use crate::common::{
    collect_markdown_file_paths, display_name_for_path, extract_wikilinks_with_lock_filter,
    is_hidden_path,
};

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
    /// When true, exclude links from locked sections
    #[serde(default)]
    pub exclude_locked: bool,
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
    collect_markdown_file_paths(&vault, &vault, &mut file_entries)?;

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

        let links = extract_wikilinks_with_lock_filter(&content, options.exclude_locked);
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
