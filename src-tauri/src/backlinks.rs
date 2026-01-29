use crate::vault::{list_markdown_files_impl, read_note_impl};
use std::collections::HashSet;

fn extract_wikilinks(text: &str) -> Vec<String> {
    let mut links = Vec::new();
    let mut seen = HashSet::new();
    let mut idx = 0;
    while let Some(start) = text[idx..].find("[[") {
        let start = idx + start + 2;
        if let Some(end) = text[start..].find("]]") {
            let end = start + end;
            let raw = &text[start..end];
            let target = raw.split('|').next().unwrap_or("");
            let normalized = normalize_wikilink_target(target);
            if !normalized.is_empty() {
                if seen.insert(normalized.clone()) {
                    links.push(normalized);
                }
            }
            idx = end + 2;
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

pub fn find_backlinks_impl(vault_path: &str, target_title: &str) -> Result<Vec<String>, String> {
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

#[cfg(test)]
mod tests {
    use super::{extract_wikilinks, normalize_wikilink_target};

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
        let links = extract_wikilinks("[[Foo]] [[ foo ]] [[FOO|bar]]");
        assert_eq!(links, vec!["foo".to_string()]);
    }
}
