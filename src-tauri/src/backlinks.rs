use crate::common::{extract_wikilinks_with_lock_filter, normalize_wikilink_target};
use crate::vault::{list_markdown_files_impl, read_note_impl};

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
