use std::path::PathBuf;
use tauri::Manager;

/// Bump this whenever demo vault files are added or changed.
const DEMO_VAULT_VERSION: &str = "4";

/// Get the path to the demo vault, creating/copying it if necessary
pub fn get_demo_vault_path_impl(app_handle: &tauri::AppHandle) -> Result<String, String> {
    // Get the app's data directory
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    // Demo vault will be stored in app_data_dir/demo-vault
    let demo_vault_path = app_data_dir.join("demo-vault");

    // Check if demo vault already exists
    if demo_vault_path.exists() && demo_vault_path.is_dir() {
        // Verify it has content
        if has_demo_content(&demo_vault_path) {
            return Ok(demo_vault_path
                .to_str()
                .ok_or("Invalid demo vault path")?
                .to_string());
        }
    }

    // Need to create/populate the demo vault
    create_demo_vault(&demo_vault_path)?;

    Ok(demo_vault_path
        .to_str()
        .ok_or("Invalid demo vault path")?
        .to_string())
}

fn has_demo_content(path: &PathBuf) -> bool {
    // Check that a version stamp exists and is current.
    // Whenever demo vault files change, bump DEMO_VAULT_VERSION so
    // existing installs get refreshed on next launch.
    let stamp = path.join(".demo-version");
    match std::fs::read_to_string(&stamp) {
        Ok(v) => v.trim() == DEMO_VAULT_VERSION,
        Err(_) => false,
    }
}

fn create_demo_vault(dest_path: &PathBuf) -> Result<(), String> {
    // Create the directory if it doesn't exist
    std::fs::create_dir_all(dest_path)
        .map_err(|e| format!("Failed to create demo vault directory: {}", e))?;

    // Copy demo vault content from embedded resources
    // The demo vault files are embedded at build time
    copy_demo_files(dest_path)?;

    Ok(())
}

fn copy_demo_files(dest_path: &PathBuf) -> Result<(), String> {
    // List of all demo vault files to copy
    let demo_files = [
        ("Welcome to Draglass.md", include_str!("../../src/demo-vault/Welcome to Draglass.md")),
        ("Quick Start Guide.md", include_str!("../../src/demo-vault/Quick Start Guide.md")),
        ("Creating Notes.md", include_str!("../../src/demo-vault/Creating Notes.md")),
        ("Wikilinks.md", include_str!("../../src/demo-vault/Wikilinks.md")),
        ("Backlinks.md", include_str!("../../src/demo-vault/Backlinks.md")),
        ("Organization Strategies.md", include_str!("../../src/demo-vault/Organization Strategies.md")),
        ("Graph View.md", include_str!("../../src/demo-vault/Graph View.md")),
        ("Philosophy.md", include_str!("../../src/demo-vault/Philosophy.md")),
        ("Science.md", include_str!("../../src/demo-vault/Science.md")),
        ("Technology.md", include_str!("../../src/demo-vault/Technology.md")),
        ("Literature.md", include_str!("../../src/demo-vault/Literature.md")),
        ("History.md", include_str!("../../src/demo-vault/History.md")),
        ("Markdown Syntax.md", include_str!("../../src/demo-vault/Markdown Syntax.md")),
        ("Daily Notes.md", include_str!("../../src/demo-vault/Daily Notes.md")),
        ("Workflow.md", include_str!("../../src/demo-vault/Workflow.md")),
        ("Computer Science.md", include_str!("../../src/demo-vault/Computer Science.md")),
        ("Mathematics.md", include_str!("../../src/demo-vault/Mathematics.md")),
        ("Ancient Greece.md", include_str!("../../src/demo-vault/Ancient Greece.md")),
        ("Enlightenment.md", include_str!("../../src/demo-vault/Enlightenment.md")),
        ("Critical Thinking.md", include_str!("../../src/demo-vault/Critical Thinking.md")),
        ("Political Theory.md", include_str!("../../src/demo-vault/Political Theory.md")),
        ("Education.md", include_str!("../../src/demo-vault/Education.md")),
        ("Innovation.md", include_str!("../../src/demo-vault/Innovation.md")),
        ("Live Preview.md", include_str!("../../src/demo-vault/Live Preview.md")),
        ("Privacy and Security.md", include_str!("../../src/demo-vault/Privacy and Security.md")),
        ("Searching Your Vault.md", include_str!("../../src/demo-vault/Searching Your Vault.md")),
        ("Tasks and Checklists.md", include_str!("../../src/demo-vault/Tasks and Checklists.md")),
        ("Customizing Draglass.md", include_str!("../../src/demo-vault/Customizing Draglass.md")),
        ("Demo Vault.md", include_str!("../../src/demo-vault/Demo Vault.md")),
        ("Locked Sections.md", include_str!("../../src/demo-vault/Locked Sections.md")),
        ("Sample Drawing.excalidraw", include_str!("../../src/demo-vault/Sample Drawing.excalidraw")),
    ];

    for (filename, content) in demo_files.iter() {
        let file_path = dest_path.join(filename);
        std::fs::write(&file_path, content)
            .map_err(|e| format!("Failed to write {}: {}", filename, e))?;
    }

    // Write version stamp so we can detect stale demo vaults.
    let stamp = dest_path.join(".demo-version");
    std::fs::write(&stamp, DEMO_VAULT_VERSION)
        .map_err(|e| format!("Failed to write demo version stamp: {}", e))?;

    Ok(())
}
