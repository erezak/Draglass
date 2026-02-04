use crate::locked_sections::{get_locked_body_ranges, is_line_in_locked_range, parse_heading_sections};
use crate::vault::{list_markdown_files_impl, read_note_impl};
use std::collections::HashSet;

/// Extract wikilinks from text, optionally excluding those in locked sections.
fn extract_wikilinks_with_lock_filter(text: &str, exclude_locked: bool) -> Vec<String> {
    // Pre-compute locked ranges if needed
    let locked_ranges = if exclude_locked {
        let sections = parse_heading_sections(text);
        get_locked_body_ranges(&sections)
    } else {
        Vec::new()
    };

    let mut links = Vec::new();
    let mut seen = HashSet::new();

    // Track current character position to line number mapping
    let mut line_starts: Vec<usize> = vec![0];
    for (i, ch) in text.char_indices() {
        if ch == '\n' {
            line_starts.push(i + 1);
        }
    }

    // Helper to convert byte offset to line number (1-based)
    let offset_to_line = |offset: usize| -> usize {
        match line_starts.binary_search(&offset) {
            Ok(i) => i + 1,
            Err(i) => i,
        }
    };

    let mut idx = 0;
    while let Some(start) = text[idx..].find("[[") {
        let abs_start = idx + start;
        let content_start = abs_start + 2;
        if let Some(end) = text[content_start..].find("]]") {
            let content_end = content_start + end;
            let raw = &text[content_start..content_end];
            let target = raw.split('|').next().unwrap_or("");
            let normalized = normalize_wikilink_target(target);

            if !normalized.is_empty() {
                // Check if this link is in a locked range
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

pub fn find_backlinks_impl(
    vault_path: &str,
    target_title: &str,
    exclude_locked: bool,
) -> Result<Vec<String>, String> {
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
        let links = extract_wikilinks_with_lock_filter(&text, exclude_locked);
        if links.iter().any(|l| l == &target_title) {
            backlinks.push(file.rel_path);
        }
    }

    backlinks.sort();
    Ok(backlinks)
}

#[cfg(test)]
mod tests {
    use super::{extract_wikilinks_with_lock_filter, normalize_wikilink_target};

    #[test]
    fn normalize_wikilinks() {
        assert_eq!(normalize_wikilink_target("  Note Name  "), "note name");
        assert_eq!(normalize_wikilink_target(" Note | Alias "), "note");
        assert_eq!(normalize_wikilink_target("Foo.md"), "foo");
        assert_eq!(normalize_wikilink_target("Foo.MD"), "foo");
        assert_eq!(normalize_wikilink_target(""), "");
    }

    #[test]
    fn extract_links() {
        let links = extract_wikilinks_with_lock_filter("[[Foo]] [[ foo ]] [[FOO|bar]]", false);
        assert_eq!(links, vec!["foo".to_string()]);
    }
}
