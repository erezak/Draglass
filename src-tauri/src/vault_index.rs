use crate::common::{
    collect_markdown_file_paths, display_name_for_path, extract_wikilinks_with_lock_filter,
    is_excalidraw_file, is_hidden_path, is_supported_note_file, normalize_wikilink_target,
    path_to_rel_string, read_text_file,
};
use crate::graph::{GraphData, GraphEdge, GraphNode, GraphOptions};
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use crate::locked_sections::{
    get_locked_body_ranges, is_line_in_locked_range, parse_heading_sections,
};
use regex::Regex;
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::Emitter;
use tauri::Manager;
use std::collections::{HashMap, HashSet};
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use std::thread::{self, JoinHandle};
use std::time::{Instant, UNIX_EPOCH};

const SCHEMA_VERSION: i64 = 1;
const QUERY_SYNC_MAX_STALENESS_MS: u64 = 10_000;
const DEFAULT_TEMPLATES_FOLDER: &str = "_templates";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchFlags {
    #[serde(default)]
    pub case_sensitive: bool,
    #[serde(default)]
    pub include_hidden: bool,
    #[serde(default)]
    pub include_locked: bool,
    #[serde(default)]
    pub templates_folder: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HighlightRange {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultHit {
    pub rel_path: String,
    pub title: String,
    pub snippet: String,
    pub highlights: Vec<HighlightRange>,
    pub score: f64,
    pub line_number: Option<usize>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResponse {
    pub results: Vec<SearchResultHit>,
    pub total: usize,
    pub took_ms: u128,
    pub next_offset: Option<usize>,
    pub canceled: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexStatus {
    pub state: String,
    pub last_indexed: Option<u64>,
    pub queue_depth: u32,
    pub rebuilding: bool,
    pub indexed_notes: u32,
    pub total_notes: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RebuildOptions {
    #[serde(default)]
    pub include_hidden: Option<bool>,
    #[serde(default)]
    pub force: Option<bool>,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub request_token: Option<String>,
    #[serde(default)]
    pub templates_folder: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RebuildResult {
    pub accepted: bool,
    pub job_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MutationResult {
    pub updated: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveResult {
    pub removed: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelResult {
    pub canceled: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatcherResult {
    pub started: bool,
    pub already_running: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatcherStopResult {
    pub stopped: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskItem {
    pub rel_path: String,
    pub note_title: String,
    pub line_number: usize,
    pub text: String,
    pub state: String,
}

#[derive(Default, Clone)]
struct RuntimeState {
    rebuilding: bool,
}

static RUNTIME_STATES: OnceLock<Mutex<HashMap<String, RuntimeState>>> = OnceLock::new();
static CANCELED_TOKENS: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();
static WATCHER_HANDLES: OnceLock<Mutex<HashMap<String, WatchHandle>>> = OnceLock::new();

struct WatchHandle {
    _watcher: RecommendedWatcher,
    stop: std::sync::Arc<AtomicBool>,
    join: Option<JoinHandle<()>>,
}

#[derive(Default)]
struct PendingChanges {
    upserts: HashSet<String>,
    removals: HashSet<String>,
    full_resync: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct VaultFileChangedEvent {
    vault_path: String,
    rel_path: String,
    kind: String,
}

const VAULT_FILE_CHANGED_EVENT: &str = "vault-file-changed";

fn runtime_states() -> &'static Mutex<HashMap<String, RuntimeState>> {
    RUNTIME_STATES.get_or_init(|| Mutex::new(HashMap::new()))
}

fn canceled_tokens() -> &'static Mutex<HashSet<String>> {
    CANCELED_TOKENS.get_or_init(|| Mutex::new(HashSet::new()))
}

fn watcher_handles() -> &'static Mutex<HashMap<String, WatchHandle>> {
    WATCHER_HANDLES.get_or_init(|| Mutex::new(HashMap::new()))
}

fn mark_canceled(token: &str) {
    if token.is_empty() {
        return;
    }
    if let Ok(mut set) = canceled_tokens().lock() {
        set.insert(token.to_string());
    }
}

fn is_canceled(token: Option<&str>) -> bool {
    let Some(token) = token else {
        return false;
    };
    if token.is_empty() {
        return false;
    }
    if let Ok(set) = canceled_tokens().lock() {
        return set.contains(token);
    }
    false
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
                return Err("parent path components are not allowed".to_string());
            }
            _ => return Err("unsupported path component".to_string()),
        }
    }

    if clean.as_os_str().is_empty() {
        return Err("empty relative path".to_string());
    }
    Ok(clean)
}

fn canonical_vault_path(vault_path: &str) -> Result<PathBuf, String> {
    let vault = std::fs::canonicalize(vault_path).map_err(|e| format!("invalid vault path: {e}"))?;
    if !vault.is_dir() {
        return Err("vault path is not a directory".to_string());
    }
    Ok(vault)
}

fn db_path_for_vault(app_handle: &tauri::AppHandle, vault_path: &str) -> Result<PathBuf, String> {
    let canonical = canonical_vault_path(vault_path)?;
    let mut hasher = Sha256::new();
    hasher.update(canonical.to_string_lossy().as_bytes());
    let hash = hex::encode(hasher.finalize());

    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data dir: {e}"))?;
    let dir = app_dir.join("vault-index");
    std::fs::create_dir_all(&dir).map_err(|e| format!("failed to create index directory: {e}"))?;
    Ok(dir.join(format!("{hash}.sqlite")))
}

fn open_connection(db_path: &Path) -> Result<Connection, String> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create db parent directory: {e}"))?;
    }

    let conn = Connection::open(db_path).map_err(|e| format!("failed to open sqlite db: {e}"))?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA temp_store=MEMORY;")
        .map_err(|e| format!("failed to configure sqlite pragmas: {e}"))?;
    Ok(conn)
}

fn ensure_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notes (
          note_id INTEGER PRIMARY KEY,
          rel_path TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          mtime_ms INTEGER NOT NULL,
          size_bytes INTEGER NOT NULL,
          content_hash TEXT,
          body_public TEXT NOT NULL,
          body_full TEXT NOT NULL,
          is_hidden INTEGER NOT NULL,
          indexed_at_ms INTEGER NOT NULL
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS fts_public USING fts5(
          note_id UNINDEXED,
          title,
          body,
          rel_path,
          tokenize='unicode61'
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS fts_full USING fts5(
          note_id UNINDEXED,
          title,
          body,
          rel_path,
          tokenize='unicode61'
        );
        ",
    )
    .map_err(|e| format!("failed to ensure schema: {e}"))?;

    conn.execute(
        "INSERT OR REPLACE INTO meta(key, value) VALUES('schema_version', ?1)",
        params![SCHEMA_VERSION.to_string()],
    )
    .map_err(|e| format!("failed to set schema version: {e}"))?;

    Ok(())
}

fn set_meta(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO meta(key, value) VALUES(?1, ?2)",
        params![key, value],
    )
    .map_err(|e| format!("failed to persist meta '{key}': {e}"))?;
    Ok(())
}

fn get_meta_u64(conn: &Connection, key: &str) -> Result<Option<u64>, String> {
    let raw: Option<String> = conn
        .query_row(
            "SELECT value FROM meta WHERE key = ?1",
            params![key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("failed to read meta '{key}': {e}"))?;
    Ok(raw.and_then(|v| v.parse::<u64>().ok()))
}

fn file_mtime_ms(metadata: &std::fs::Metadata) -> Result<u64, String> {
    let modified = metadata
        .modified()
        .map_err(|e| format!("failed to read modified time: {e}"))?;
    let duration = modified
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("invalid modified timestamp: {e}"))?;
    Ok(duration.as_millis() as u64)
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn normalize_templates_folder(value: Option<&str>) -> String {
    let normalized = value
        .unwrap_or(DEFAULT_TEMPLATES_FOLDER)
        .replace('\\', "/")
        .trim()
        .trim_matches('/')
        .to_string();
    if normalized.is_empty() {
        DEFAULT_TEMPLATES_FOLDER.to_string()
    } else {
        normalized
    }
}

fn is_template_rel_path(rel_path: &str, templates_folder: &str) -> bool {
    let normalized_rel = rel_path.replace('\\', "/").trim_matches('/').to_ascii_lowercase();
    let normalized_folder = normalize_templates_folder(Some(templates_folder)).to_ascii_lowercase();
    normalized_rel == normalized_folder || normalized_rel.starts_with(&(normalized_folder + "/"))
}

fn load_templates_folder(conn: &Connection) -> String {
    let stored: Option<String> = conn
        .query_row(
            "SELECT value FROM meta WHERE key = 'templates_folder'",
            [],
            |row| row.get(0),
        )
        .optional()
        .ok()
        .flatten();
    normalize_templates_folder(stored.as_deref())
}

fn template_folder_and_prefix(templates_folder: Option<&str>) -> (String, String) {
    let folder = normalize_templates_folder(templates_folder);
    let prefix = format!("{folder}/");
    (folder, prefix)
}

fn content_hash(text: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(text.as_bytes());
    hex::encode(hasher.finalize())
}

fn filter_locked_body_content(text: &str) -> String {
    let sections = parse_heading_sections(text);
    let ranges = get_locked_body_ranges(&sections);
    if ranges.is_empty() {
        return text.to_string();
    }

    let mut output = String::with_capacity(text.len());
    for (index, line) in text.lines().enumerate() {
        let line_number = index + 1;
        if is_line_in_locked_range(line_number, &ranges) {
            output.push('\n');
        } else {
            output.push_str(line);
            output.push('\n');
        }
    }

    if !text.ends_with('\n') && output.ends_with('\n') {
        output.pop();
    }
    output
}

fn to_fts_query(query: &str) -> Option<String> {
    let tokens: Vec<String> = query
        .split_whitespace()
        .map(str::trim)
        .filter(|t| !t.is_empty())
        .map(|token| {
            let cleaned = token
                .trim_matches(|ch: char| !ch.is_alphanumeric() && ch != '_')
                .to_lowercase();
            
            // If cleaned is empty, or if the token contains special FTS5 characters,
            // wrap it in quotes for literal matching
            if cleaned.is_empty() || cleaned.chars().any(|ch| !ch.is_alphanumeric() && ch != '_') {
                format!("\"{}\"", cleaned.replace('"', "\"\""))
            } else {
                // Otherwise use prefix matching
                format!("{cleaned}*")
            }
        })
        .collect();

    if tokens.is_empty() {
        None
    } else {
        Some(tokens.join(" AND "))
    }
}

fn parse_marked_snippet(marked: &str) -> (String, Vec<HighlightRange>) {
    const START: char = '\u{E000}';
    const END: char = '\u{E001}';

    let mut snippet = String::new();
    let mut highlights = Vec::new();
    let mut current_start: Option<usize> = None;

    for ch in marked.chars() {
        if ch == START {
            current_start = Some(snippet.chars().count());
            continue;
        }
        if ch == END {
            if let Some(start) = current_start.take() {
                let end = snippet.chars().count();
                if end > start {
                    highlights.push(HighlightRange { start, end });
                }
            }
            continue;
        }
        snippet.push(ch);
    }

    (snippet, highlights)
}

const SNIPPET_MARKER_START: &str = "\u{E000}";
const SNIPPET_MARKER_END: &str = "\u{E001}";

fn find_line_number(body: &str, query: &str, case_sensitive: bool) -> Option<usize> {
    if query.trim().is_empty() {
        return None;
    }

    let needle = query.trim();
    for (index, line) in body.lines().enumerate() {
        let matched = if case_sensitive {
            line.contains(needle)
        } else {
            line.to_lowercase().contains(&needle.to_lowercase())
        };
        if matched {
            return Some(index + 1);
        }
    }
    None
}

fn remove_note_rows(tx: &Transaction<'_>, rel_path: &str) -> Result<bool, String> {
    let note_id: Option<i64> = tx
        .query_row(
            "SELECT note_id FROM notes WHERE rel_path = ?1",
            params![rel_path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("failed to load note for removal: {e}"))?;

    let Some(note_id) = note_id else {
        return Ok(false);
    };

    tx.execute("DELETE FROM fts_public WHERE note_id = ?1", params![note_id])
        .map_err(|e| format!("failed to delete fts_public row: {e}"))?;
    tx.execute("DELETE FROM fts_full WHERE note_id = ?1", params![note_id])
        .map_err(|e| format!("failed to delete fts_full row: {e}"))?;
    tx.execute("DELETE FROM notes WHERE note_id = ?1", params![note_id])
        .map_err(|e| format!("failed to delete note row: {e}"))?;

    Ok(true)
}

fn upsert_note_row(
    tx: &Transaction<'_>,
    rel_path: &str,
    title: &str,
    mtime_ms: u64,
    size_bytes: u64,
    body_full: &str,
    body_public: &str,
    is_hidden: bool,
) -> Result<(), String> {
    let hash = content_hash(body_full);

    tx.execute(
        "
        INSERT INTO notes(
          rel_path, title, mtime_ms, size_bytes, content_hash, body_public, body_full, is_hidden, indexed_at_ms
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        ON CONFLICT(rel_path) DO UPDATE SET
          title = excluded.title,
          mtime_ms = excluded.mtime_ms,
          size_bytes = excluded.size_bytes,
          content_hash = excluded.content_hash,
          body_public = excluded.body_public,
          body_full = excluded.body_full,
          is_hidden = excluded.is_hidden,
          indexed_at_ms = excluded.indexed_at_ms
        ",
        params![
            rel_path,
            title,
            mtime_ms as i64,
            size_bytes as i64,
            hash,
            body_public,
            body_full,
            if is_hidden { 1_i64 } else { 0_i64 },
            now_ms() as i64,
        ],
    )
    .map_err(|e| format!("failed to upsert note row: {e}"))?;

    let note_id: i64 = tx
        .query_row(
            "SELECT note_id FROM notes WHERE rel_path = ?1",
            params![rel_path],
            |row| row.get(0),
        )
        .map_err(|e| format!("failed to resolve note id: {e}"))?;

    tx.execute("DELETE FROM fts_public WHERE note_id = ?1", params![note_id])
        .map_err(|e| format!("failed to delete existing fts_public row: {e}"))?;
    tx.execute("DELETE FROM fts_full WHERE note_id = ?1", params![note_id])
        .map_err(|e| format!("failed to delete existing fts_full row: {e}"))?;

    tx.execute(
        "INSERT INTO fts_public(note_id, title, body, rel_path) VALUES(?1, ?2, ?3, ?4)",
        params![note_id, title, body_public, rel_path],
    )
    .map_err(|e| format!("failed to insert fts_public row: {e}"))?;

    tx.execute(
        "INSERT INTO fts_full(note_id, title, body, rel_path) VALUES(?1, ?2, ?3, ?4)",
        params![note_id, title, body_full, rel_path],
    )
    .map_err(|e| format!("failed to insert fts_full row: {e}"))?;

    Ok(())
}

fn sync_index(
    vault: &Path,
    conn: &mut Connection,
    request_token: Option<&str>,
    templates_folder: &str,
) -> Result<(), String> {
    ensure_schema(conn)?;

    let mut file_entries: Vec<(String, PathBuf)> = Vec::new();
    collect_markdown_file_paths(vault, vault, &mut file_entries)?;

    let mut existing: HashMap<String, (u64, u64)> = HashMap::new();
    {
        let mut stmt = conn
            .prepare("SELECT rel_path, mtime_ms, size_bytes FROM notes")
            .map_err(|e| format!("failed to prepare existing notes query: {e}"))?;
        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, i64>(1)? as u64,
                    row.get::<_, i64>(2)? as u64,
                ))
            })
            .map_err(|e| format!("failed to query existing notes: {e}"))?;
        for row in rows {
            let (rel_path, mtime_ms, size_bytes) =
                row.map_err(|e| format!("failed to read existing note row: {e}"))?;
            existing.insert(rel_path, (mtime_ms, size_bytes));
        }
    }

    let tx = conn
        .transaction()
        .map_err(|e| format!("failed to open sqlite transaction: {e}"))?;

    let mut seen_paths = HashSet::new();

    for (rel_path, full_path) in file_entries {
        if is_canceled(request_token) {
            tx.rollback()
                .map_err(|e| format!("failed to rollback canceled transaction: {e}"))?;
            return Err("operation canceled".to_string());
        }

        if is_template_rel_path(&rel_path, templates_folder) {
            remove_note_rows(&tx, &rel_path)?;
            continue;
        }

        let metadata = match std::fs::metadata(&full_path) {
            Ok(m) => m,
            Err(_) => continue,
        };
        let mtime_ms = match file_mtime_ms(&metadata) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let size_bytes = metadata.len();
        seen_paths.insert(rel_path.clone());

        if let Some((existing_mtime, existing_size)) = existing.get(&rel_path) {
            if *existing_mtime == mtime_ms && *existing_size == size_bytes {
                continue;
            }
        }

        let body_full = match read_text_file(&full_path) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let body_public = filter_locked_body_content(&body_full);
        let title = display_name_for_path(&full_path);
        let is_hidden = is_hidden_path(&rel_path);

        upsert_note_row(
            &tx,
            &rel_path,
            &title,
            mtime_ms,
            size_bytes,
            &body_full,
            &body_public,
            is_hidden,
        )?;
    }

    for rel_path in existing.keys() {
        if seen_paths.contains(rel_path) {
            continue;
        }
        remove_note_rows(&tx, rel_path)?;
    }

    tx.commit()
        .map_err(|e| format!("failed to commit index transaction: {e}"))?;

    set_meta(conn, "last_indexed_ms", &now_ms().to_string())?;
    Ok(())
}

fn sync_index_for_watcher(app_handle: &tauri::AppHandle, vault_path: &str) -> Result<(), String> {
    let vault = canonical_vault_path(vault_path)?;
    let db_path = db_path_for_vault(app_handle, vault_path)?;
    let mut conn = open_connection(&db_path)?;
    let templates_folder = load_templates_folder(&conn);
    sync_index(&vault, &mut conn, None, &templates_folder)
}

fn apply_incremental_changes_for_watcher(
    app_handle: &tauri::AppHandle,
    vault_path: &str,
    upserts: &HashSet<String>,
    removals: &HashSet<String>,
) -> Result<(), String> {
    if upserts.is_empty() && removals.is_empty() {
        return Ok(());
    }

    let vault = canonical_vault_path(vault_path)?;
    let db_path = db_path_for_vault(app_handle, vault_path)?;
    let mut conn = open_connection(&db_path)?;
    ensure_schema(&conn)?;
    let templates_folder = load_templates_folder(&conn);

    let tx = conn
        .transaction()
        .map_err(|e| format!("failed to open sqlite transaction: {e}"))?;

    for rel_path in removals {
        remove_note_rows(&tx, rel_path)?;
    }

    for rel_path in upserts {
        if is_template_rel_path(rel_path, &templates_folder) {
            remove_note_rows(&tx, rel_path)?;
            continue;
        }

        let rel = sanitize_rel_path(rel_path)?;
        let rel_path_normalized = rel.to_string_lossy().replace('\\', "/");
        let full_path = vault.join(&rel);

        if !full_path.exists() || !full_path.is_file() {
            remove_note_rows(&tx, &rel_path_normalized)?;
            continue;
        }

        let metadata = match std::fs::metadata(&full_path) {
            Ok(v) => v,
            Err(_) => {
                remove_note_rows(&tx, &rel_path_normalized)?;
                continue;
            }
        };

        let mtime_ms = match file_mtime_ms(&metadata) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let size_bytes = metadata.len();

        let body_full = match read_text_file(&full_path) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let body_public = filter_locked_body_content(&body_full);
        let title = display_name_for_path(&full_path);
        let is_hidden = is_hidden_path(&rel_path_normalized);

        upsert_note_row(
            &tx,
            &rel_path_normalized,
            &title,
            mtime_ms,
            size_bytes,
            &body_full,
            &body_public,
            is_hidden,
        )?;
    }

    tx.commit()
        .map_err(|e| format!("failed to commit incremental watcher transaction: {e}"))?;
    set_meta(&conn, "last_indexed_ms", &now_ms().to_string())?;
    Ok(())
}

fn classify_event_paths(vault: &Path, event: &Event, pending: &mut PendingChanges) {
    let mut matched_any_note = false;

    for original_path in &event.paths {
        let absolute_path = if original_path.is_absolute() {
            original_path.clone()
        } else {
            vault.join(original_path)
        };

        if !is_supported_note_file(&absolute_path) {
            continue;
        }

        let rel_path = match path_to_rel_string(vault, &absolute_path) {
            Ok(v) => v,
            Err(_) => continue,
        };

        matched_any_note = true;

        match event.kind {
            EventKind::Remove(_) => {
                pending.removals.insert(rel_path.clone());
                pending.upserts.remove(&rel_path);
            }
            _ => {
                if absolute_path.exists() {
                    pending.upserts.insert(rel_path.clone());
                    pending.removals.remove(&rel_path);
                } else {
                    pending.removals.insert(rel_path.clone());
                    pending.upserts.remove(&rel_path);
                }
            }
        }
    }

    if !matched_any_note {
        pending.full_resync = true;
    }
}

fn load_notes_for_derived(
    conn: &Connection,
    include_hidden: bool,
    include_locked: bool,
) -> Result<Vec<(String, String, String, bool, u64)>, String> {
    let body_column = if include_locked { "body_full" } else { "body_public" };
    let sql = format!(
        "SELECT rel_path, title, {body_column}, is_hidden, mtime_ms FROM notes {} ORDER BY rel_path ASC",
        if include_hidden { "" } else { "WHERE is_hidden = 0" }
    );

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("failed to prepare derived note query: {e}"))?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)? == 1,
                row.get::<_, i64>(4)? as u64,
            ))
        })
        .map_err(|e| format!("failed to run derived note query: {e}"))?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| format!("failed to decode derived note row: {e}"))?);
    }
    Ok(result)
}

fn primary_query_term(query: &str) -> String {
    query
        .split_whitespace()
        .map(str::trim)
        .filter(|token| !token.is_empty())
        .map(|token| {
            token
                .trim_matches(|ch: char| !ch.is_alphanumeric() && ch != '_')
                .to_string()
        })
        .filter(|token| !token.is_empty())
        .max_by_key(|token| token.len())
        .unwrap_or_else(|| query.trim().to_string())
}

pub fn cancel_request_impl(request_token: &str) -> Result<CancelResult, String> {
    mark_canceled(request_token);
    Ok(CancelResult { canceled: true })
}

pub fn rebuild_index_impl(
    app_handle: &tauri::AppHandle,
    vault_path: &str,
    options: RebuildOptions,
) -> Result<RebuildResult, String> {
    let vault = canonical_vault_path(vault_path)?;
    let db_path = db_path_for_vault(app_handle, vault_path)?;
    let mut conn = open_connection(&db_path)?;

    let _ = options.include_hidden;
    let _ = options.force;
    let _ = options.reason;
    let templates_folder = normalize_templates_folder(options.templates_folder.as_deref());
    set_meta(&conn, "templates_folder", &templates_folder)?;

    let key = vault.to_string_lossy().to_string();
    {
        let mut states = runtime_states()
            .lock()
            .map_err(|_| "failed to acquire runtime state lock".to_string())?;
        states
            .entry(key.clone())
            .and_modify(|s| s.rebuilding = true)
            .or_insert(RuntimeState { rebuilding: true });
    }

    let started = Instant::now();
    let result = sync_index(
        &vault,
        &mut conn,
        options.request_token.as_deref(),
        &templates_folder,
    );

    {
        let mut states = runtime_states()
            .lock()
            .map_err(|_| "failed to acquire runtime state lock".to_string())?;
        states
            .entry(key)
            .and_modify(|s| s.rebuilding = false)
            .or_insert(RuntimeState { rebuilding: false });
    }

    result?;

    Ok(RebuildResult {
        accepted: true,
        job_id: format!("rebuild-{}", started.elapsed().as_millis()),
    })
}

pub fn ensure_index_impl(app_handle: &tauri::AppHandle, vault_path: &str) -> Result<(), String> {
    let vault = canonical_vault_path(vault_path)?;
    let key = vault.to_string_lossy().to_string();
    let db_path = db_path_for_vault(app_handle, vault_path)?;
    let mut conn = open_connection(&db_path)?;
    ensure_schema(&conn)?;
    let templates_folder = load_templates_folder(&conn);

    let last_indexed = get_meta_u64(&conn, "last_indexed_ms")?;
    let has_indexed_rows: bool = conn
        .query_row("SELECT EXISTS(SELECT 1 FROM notes LIMIT 1)", [], |row| {
            row.get::<_, i64>(0)
        })
        .map(|v| v == 1)
        .unwrap_or(false);

    if !has_indexed_rows || last_indexed.is_none() {
        return sync_index(&vault, &mut conn, None, &templates_folder);
    }

    let watcher_running = watcher_handles()
        .lock()
        .ok()
        .map(|handles| handles.contains_key(&key))
        .unwrap_or(false);

    if watcher_running {
        return Ok(());
    }

    let stale = last_indexed
        .map(|ts| now_ms().saturating_sub(ts) > QUERY_SYNC_MAX_STALENESS_MS)
        .unwrap_or(true);

    if stale {
        sync_index(&vault, &mut conn, None, &templates_folder)?;
    }

    Ok(())
}

pub fn index_status_impl(app_handle: &tauri::AppHandle, vault_path: &str) -> Result<IndexStatus, String> {
    let vault = canonical_vault_path(vault_path)?;
    let db_path = db_path_for_vault(app_handle, vault_path)?;
    let conn = open_connection(&db_path)?;
    ensure_schema(&conn)?;
    let templates_folder = load_templates_folder(&conn);

    let indexed_notes: u32 = conn
        .query_row("SELECT COUNT(*) FROM notes", [], |row| row.get::<_, i64>(0))
        .map(|v| v as u32)
        .unwrap_or(0);

    let mut total_markdown_files: Vec<(String, PathBuf)> = Vec::new();
    collect_markdown_file_paths(&vault, &vault, &mut total_markdown_files)?;
    total_markdown_files.retain(|(rel_path, _)| !is_template_rel_path(rel_path, &templates_folder));

    let key = vault.to_string_lossy().to_string();
    let rebuilding = runtime_states()
        .lock()
        .ok()
        .and_then(|states| states.get(&key).map(|s| s.rebuilding))
        .unwrap_or(false);

    Ok(IndexStatus {
        state: if rebuilding {
            "rebuilding".to_string()
        } else {
            "idle".to_string()
        },
        last_indexed: get_meta_u64(&conn, "last_indexed_ms")?,
        queue_depth: 0,
        rebuilding,
        indexed_notes,
        total_notes: total_markdown_files.len() as u32,
    })
}

pub fn upsert_note_impl(
    app_handle: &tauri::AppHandle,
    vault_path: &str,
    rel_path: &str,
    text: Option<String>,
    mtime_ms: Option<u64>,
    size_bytes: Option<u64>,
) -> Result<MutationResult, String> {
    let vault = canonical_vault_path(vault_path)?;
    let rel = sanitize_rel_path(rel_path)?;
    let full = vault.join(&rel);

    if !full.exists() || !full.is_file() {
        return remove_note_impl(app_handle, vault_path, rel_path).map(|_| MutationResult { updated: false });
    }

    let db_path = db_path_for_vault(app_handle, vault_path)?;
    let mut conn = open_connection(&db_path)?;
    ensure_schema(&conn)?;
    let templates_folder = load_templates_folder(&conn);

    let metadata = std::fs::metadata(&full).map_err(|e| format!("failed to read note metadata: {e}"))?;
    let resolved_mtime = match mtime_ms {
        Some(v) => v,
        None => file_mtime_ms(&metadata)?,
    };
    let resolved_size = size_bytes.unwrap_or(metadata.len());
    let body_full = match text {
        Some(v) => v,
        None => std::fs::read_to_string(&full).map_err(|e| format!("failed to read note: {e}"))?,
    };
    let body_public = filter_locked_body_content(&body_full);
    let rel_path_str = rel.to_string_lossy().replace('\\', "/");
    if is_template_rel_path(&rel_path_str, &templates_folder) {
        return remove_note_impl(app_handle, vault_path, &rel_path_str)
            .map(|_| MutationResult { updated: false });
    }
    let is_hidden = is_hidden_path(&rel_path_str);
    let title = display_name_for_path(&full);

    let tx = conn
        .transaction()
        .map_err(|e| format!("failed to open sqlite transaction: {e}"))?;
    upsert_note_row(
        &tx,
        &rel_path_str,
        &title,
        resolved_mtime,
        resolved_size,
        &body_full,
        &body_public,
        is_hidden,
    )?;
    tx.commit()
        .map_err(|e| format!("failed to commit upsert transaction: {e}"))?;
    set_meta(&conn, "last_indexed_ms", &now_ms().to_string())?;

    Ok(MutationResult { updated: true })
}

pub fn remove_note_impl(
    app_handle: &tauri::AppHandle,
    vault_path: &str,
    rel_path: &str,
) -> Result<RemoveResult, String> {
    let db_path = db_path_for_vault(app_handle, vault_path)?;
    let mut conn = open_connection(&db_path)?;
    ensure_schema(&conn)?;

    let tx = conn
        .transaction()
        .map_err(|e| format!("failed to open sqlite transaction: {e}"))?;
    let removed = remove_note_rows(&tx, rel_path)?;
    tx.commit()
        .map_err(|e| format!("failed to commit remove transaction: {e}"))?;
    set_meta(&conn, "last_indexed_ms", &now_ms().to_string())?;

    Ok(RemoveResult { removed })
}

pub fn search_v2_impl(
    app_handle: &tauri::AppHandle,
    vault_path: &str,
    query: &str,
    flags: SearchFlags,
    limit: usize,
    offset: usize,
    request_token: Option<String>,
) -> Result<SearchResponse, String> {
    let started = Instant::now();
    if query.trim().is_empty() {
        return Ok(SearchResponse {
            results: Vec::new(),
            total: 0,
            took_ms: 0,
            next_offset: None,
            canceled: false,
        });
    }

    ensure_index_impl(app_handle, vault_path)?;
    if is_canceled(request_token.as_deref()) {
        return Ok(SearchResponse {
            results: Vec::new(),
            total: 0,
            took_ms: started.elapsed().as_millis(),
            next_offset: None,
            canceled: true,
        });
    }

    let db_path = db_path_for_vault(app_handle, vault_path)?;
    let conn = open_connection(&db_path)?;
    let (templates_folder, template_prefix) = template_folder_and_prefix(flags.templates_folder.as_deref());

    let body_column = if flags.include_locked {
        "body_full"
    } else {
        "body_public"
    };

    let total: usize;
    let mut results = Vec::new();

    if flags.case_sensitive {
        let where_hidden = if flags.include_hidden {
            ""
        } else {
            "AND is_hidden = 0"
        };
        let template_exclusion_clause_count = "AND rel_path <> ?2 AND rel_path NOT LIKE ?3";
        let template_exclusion_clause_select = "AND rel_path <> ?4 AND rel_path NOT LIKE ?5";

        let count_sql = format!(
            "SELECT COUNT(*) FROM notes WHERE {body_column} LIKE '%' || ?1 || '%' {where_hidden} {template_exclusion_clause_count}"
        );
        total = conn
            .query_row(
                &count_sql,
                params![query, templates_folder, template_prefix],
                |row| row.get::<_, i64>(0),
            )
            .map(|v| v as usize)
            .unwrap_or(0);

        let sql = format!(
            "
            SELECT rel_path, title, {body_column}
            FROM notes
            WHERE {body_column} LIKE '%' || ?1 || '%'
            {where_hidden}
            {template_exclusion_clause_select}
            ORDER BY CASE WHEN title = ?1 THEN 0 WHEN title LIKE ?1 || '%' THEN 1 ELSE 2 END, rel_path ASC
            LIMIT ?2 OFFSET ?3
            "
        );

        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| format!("failed to prepare case-sensitive search query: {e}"))?;
        let rows = stmt
            .query_map(
                params![
                    query,
                    limit as i64,
                    offset as i64,
                    templates_folder,
                    template_prefix
                ],
                |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })
            .map_err(|e| format!("failed to run case-sensitive search query: {e}"))?;

        for row in rows {
            if is_canceled(request_token.as_deref()) {
                break;
            }
            let (rel_path, title, body) = row.map_err(|e| format!("failed to decode search row: {e}"))?;
            let line_number = find_line_number(&body, query, true);
            let first_line = line_number
                .and_then(|n| body.lines().nth(n.saturating_sub(1)).map(|v| v.to_string()))
                .unwrap_or_default();
            let mut highlights = Vec::new();
            let mut start_at = 0;
            while let Some(pos) = first_line[start_at..].find(query) {
                let start = start_at + pos;
                let end = start + query.len();
                highlights.push(HighlightRange { start, end });
                start_at = end;
                if start_at >= first_line.len() {
                    break;
                }
            }

            results.push(SearchResultHit {
                rel_path,
                title,
                snippet: first_line,
                highlights,
                score: 1.0,
                line_number,
            });
        }
    } else {
        let Some(fts_query) = to_fts_query(query) else {
            return Ok(SearchResponse {
                results: Vec::new(),
                total: 0,
                took_ms: started.elapsed().as_millis(),
                next_offset: None,
                canceled: false,
            });
        };

        let fts_table = if flags.include_locked {
            "fts_full"
        } else {
            "fts_public"
        };
        let hidden_clause = if flags.include_hidden {
            ""
        } else {
            "AND n.is_hidden = 0"
        };
        let template_exclusion_clause_count = "AND n.rel_path <> ?2 AND n.rel_path NOT LIKE ?3";
        let template_exclusion_clause_select = "AND n.rel_path <> ?4 AND n.rel_path NOT LIKE ?5";

        let count_sql = format!(
            "SELECT COUNT(*) FROM {fts_table} JOIN notes n ON n.note_id = {fts_table}.note_id WHERE {fts_table} MATCH ?1 {hidden_clause} {template_exclusion_clause_count}"
        );
        total = conn
            .query_row(
                &count_sql,
                params![fts_query, templates_folder, template_prefix],
                |row| row.get::<_, i64>(0),
            )
            .map(|v| v as usize)
            .unwrap_or(0);

        let sql = format!(
            "
            SELECT
              n.rel_path,
              n.title,
              n.{body_column},
                            snippet({fts_table}, 2, '{SNIPPET_MARKER_START}', '{SNIPPET_MARKER_END}', ' … ', 24),
                            bm25({fts_table}, 8.0, 1.0, 2.5)
                        FROM {fts_table}
                        JOIN notes n ON n.note_id = {fts_table}.note_id
            WHERE {fts_table} MATCH ?1
            {hidden_clause}
            {template_exclusion_clause_select}
            ORDER BY bm25({fts_table}, 8.0, 1.0, 2.5) ASC
            LIMIT ?2 OFFSET ?3
            "
        );

        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| format!("failed to prepare fts query: {e}"))?;
        let rows = stmt
            .query_map(
                params![
                    fts_query,
                    limit as i64,
                    offset as i64,
                    templates_folder,
                    template_prefix
                ],
                |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, f64>(4)?,
                ))
            })
            .map_err(|e| format!("failed to run fts query: {e}"))?;

        let query_term = primary_query_term(query);

        for row in rows {
            if is_canceled(request_token.as_deref()) {
                break;
            }

            let (rel_path, title, body, marked_snippet, bm25_score) =
                row.map_err(|e| format!("failed to decode fts row: {e}"))?;
            let (snippet, mut highlights) = parse_marked_snippet(&marked_snippet);
            if highlights.is_empty() && !query_term.is_empty() {
                let needle = query_term.to_lowercase();
                let hay = snippet.to_lowercase();
                if let Some(pos) = hay.find(&needle) {
                    highlights.push(HighlightRange {
                        start: pos,
                        end: pos + needle.len(),
                    });
                }
            }

            results.push(SearchResultHit {
                rel_path,
                title,
                snippet,
                highlights,
                score: -bm25_score,
                line_number: find_line_number(&body, &query_term, false),
            });
        }
    }

    let canceled = is_canceled(request_token.as_deref());
    let next_offset = if !canceled && offset + results.len() < total {
        Some(offset + results.len())
    } else {
        None
    };

    Ok(SearchResponse {
        results,
        total,
        took_ms: started.elapsed().as_millis(),
        next_offset,
        canceled,
    })
}

pub fn find_backlinks_v2_impl(
    app_handle: &tauri::AppHandle,
    vault_path: &str,
    target_title: &str,
    include_locked: bool,
    show_hidden: bool,
) -> Result<Vec<String>, String> {
    ensure_index_impl(app_handle, vault_path)?;
    let db_path = db_path_for_vault(app_handle, vault_path)?;
    let conn = open_connection(&db_path)?;

    let target = normalize_wikilink_target(target_title);
    if target.is_empty() {
        return Ok(Vec::new());
    }

    let notes = load_notes_for_derived(&conn, show_hidden, include_locked)?;
    let mut backlinks = Vec::new();

    for (rel_path, _title, body, _is_hidden, _mtime_ms) in notes {
        let path = Path::new(&rel_path);
        if is_excalidraw_file(path) {
            continue;
        }

        let links = extract_wikilinks_with_lock_filter(&body, false);
        if links.iter().any(|l| l == &target) {
            backlinks.push(rel_path);
        }
    }

    backlinks.sort();
    Ok(backlinks)
}

pub fn build_graph_v2_impl(
    app_handle: &tauri::AppHandle,
    vault_path: &str,
    options: GraphOptions,
) -> Result<GraphData, String> {
    ensure_index_impl(app_handle, vault_path)?;
    let db_path = db_path_for_vault(app_handle, vault_path)?;
    let conn = open_connection(&db_path)?;

    let notes = load_notes_for_derived(&conn, options.show_hidden, !options.exclude_locked)?;

    let mut stem_to_rel_path: HashMap<String, String> = HashMap::new();
    for (rel_path, _title, _body, _is_hidden, _mtime_ms) in &notes {
        let stem = rel_path
            .rsplit('/')
            .next()
            .unwrap_or(rel_path)
            .trim_end_matches(".md")
            .trim_end_matches(".markdown")
            .to_ascii_lowercase();
        stem_to_rel_path
            .entry(stem)
            .or_insert_with(|| rel_path.clone());

        let without_ext = rel_path
            .trim_end_matches(".md")
            .trim_end_matches(".markdown")
            .to_ascii_lowercase();
        stem_to_rel_path
            .entry(without_ext)
            .or_insert_with(|| rel_path.clone());
    }

    let mut in_degree: HashMap<String, u32> = HashMap::new();
    let mut out_degree: HashMap<String, u32> = HashMap::new();
    let mut edge_counts: HashMap<(String, String), u32> = HashMap::new();

    for (rel_path, _title, body, _is_hidden, _mtime_ms) in &notes {
        let path = Path::new(rel_path);
        if is_excalidraw_file(path) {
            continue;
        }

        let links = extract_wikilinks_with_lock_filter(body, false);
        out_degree.insert(rel_path.clone(), links.len() as u32);

        for link in links {
            if let Some(target_rel_path) = stem_to_rel_path.get(&link) {
                *in_degree.entry(target_rel_path.clone()).or_insert(0) += 1;
                let key = (rel_path.clone(), target_rel_path.clone());
                *edge_counts.entry(key).or_insert(0) += 1;
            }
        }
    }

    let mut nodes: Vec<GraphNode> = notes
        .into_iter()
        .filter(|(rel_path, _, _, _, _)| !is_excalidraw_file(Path::new(rel_path)))
        .map(|(rel_path, title, _body, is_hidden, mtime_ms)| {
            let id = rel_path
                .trim_end_matches(".md")
                .trim_end_matches(".markdown")
                .to_ascii_lowercase();

            GraphNode {
                id,
                title,
                rel_path: rel_path.clone(),
                is_hidden,
                degree_in: *in_degree.get(&rel_path).unwrap_or(&0),
                degree_out: *out_degree.get(&rel_path).unwrap_or(&0),
                created_at: None,
                modified_at: Some(mtime_ms),
            }
        })
        .collect();

    let edges: Vec<GraphEdge> = edge_counts
        .into_iter()
        .map(|((source_rel_path, target_rel_path), count)| GraphEdge {
            source_id: source_rel_path
                .trim_end_matches(".md")
                .trim_end_matches(".markdown")
                .to_ascii_lowercase(),
            target_id: target_rel_path
                .trim_end_matches(".md")
                .trim_end_matches(".markdown")
                .to_ascii_lowercase(),
            count,
        })
        .collect();

    nodes.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));

    Ok(GraphData { nodes, edges })
}

fn parse_tasks(text: &str) -> Vec<(usize, char, String)> {
    let task_re = Regex::new(r"^(\s*)([-+*])\s+\[( |x|X|-)\]\s*(.*)$").expect("valid task regex");
    let fence_re = Regex::new(r"^\s{0,3}```").expect("valid fence regex");
    let blockquote_re = Regex::new(r"^\s*>").expect("valid blockquote regex");

    let mut in_fence = false;
    let mut tasks = Vec::new();

    for (idx, line) in text.lines().enumerate() {
        if fence_re.is_match(line) {
            in_fence = !in_fence;
            continue;
        }
        if in_fence || blockquote_re.is_match(line) {
            continue;
        }

        let Some(caps) = task_re.captures(line) else {
            continue;
        };
        let raw_state = caps.get(3).map(|m| m.as_str()).unwrap_or(" ").to_lowercase();
        let state = raw_state.chars().next().unwrap_or(' ');
        let text = caps
            .get(4)
            .map(|m| m.as_str().trim().to_string())
            .unwrap_or_default();
        tasks.push((idx + 1, state, text));
    }

    tasks
}

pub fn list_tasks_v2_impl(
    app_handle: &tauri::AppHandle,
    vault_path: &str,
    show_hidden: bool,
    include_locked: bool,
) -> Result<Vec<TaskItem>, String> {
    ensure_index_impl(app_handle, vault_path)?;
    let db_path = db_path_for_vault(app_handle, vault_path)?;
    let conn = open_connection(&db_path)?;

    let notes = load_notes_for_derived(&conn, show_hidden, include_locked)?;
    let mut results = Vec::new();

    for (rel_path, title, body, _is_hidden, _mtime_ms) in notes {
        let path = Path::new(&rel_path);
        if is_excalidraw_file(path) {
            continue;
        }

        for (line_number, state, text) in parse_tasks(&body) {
            if state == 'x' {
                continue;
            }
            results.push(TaskItem {
                rel_path: rel_path.clone(),
                note_title: title.clone(),
                line_number,
                text,
                state: state.to_string(),
            });
        }
    }

    Ok(results)
}

pub fn start_index_watcher_impl(
    app_handle: &tauri::AppHandle,
    vault_path: &str,
) -> Result<WatcherResult, String> {
    let vault = canonical_vault_path(vault_path)?;
    let key = vault.to_string_lossy().to_string();
    let event_vault_path = vault_path.to_string();

    {
        let handles = watcher_handles()
            .lock()
            .map_err(|_| "failed to acquire watcher lock".to_string())?;
        if handles.contains_key(&key) {
            return Ok(WatcherResult {
                started: true,
                already_running: true,
            });
        }
    }

    let _ = sync_index_for_watcher(app_handle, &key);

    let pending_changes = std::sync::Arc::new(Mutex::new(PendingChanges {
        upserts: HashSet::new(),
        removals: HashSet::new(),
        full_resync: true,
    }));
    let stop = std::sync::Arc::new(AtomicBool::new(false));
    let pending_for_callback = pending_changes.clone();
    let vault_for_callback = vault.clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: notify::Result<Event>| {
            if let Ok(event) = res {
                if let Ok(mut pending) = pending_for_callback.lock() {
                    classify_event_paths(&vault_for_callback, &event, &mut pending);
                }
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("failed to create filesystem watcher: {e}"))?;

    watcher
        .watch(&vault, RecursiveMode::Recursive)
        .map_err(|e| format!("failed to watch vault path: {e}"))?;

    let app_handle_clone = app_handle.clone();
    let vault_path_clone = key.clone();
    let event_vault_path_clone = event_vault_path.clone();
    let stop_for_thread = stop.clone();
    let pending_for_thread = pending_changes.clone();

    let join = thread::spawn(move || {
        let mut last_poll = Instant::now();
        loop {
            if stop_for_thread.load(Ordering::Relaxed) {
                break;
            }

            let (upserts, removals, force_resync) = {
                let mut pending = match pending_for_thread.lock() {
                    Ok(v) => v,
                    Err(_) => {
                        thread::sleep(std::time::Duration::from_millis(150));
                        continue;
                    }
                };

                if last_poll.elapsed().as_secs() >= 60 {
                    pending.full_resync = true;
                }

                if pending.upserts.is_empty() && pending.removals.is_empty() && !pending.full_resync {
                    (HashSet::new(), HashSet::new(), false)
                } else {
                    (
                        std::mem::take(&mut pending.upserts),
                        std::mem::take(&mut pending.removals),
                        std::mem::replace(&mut pending.full_resync, false),
                    )
                }
            };

            if !upserts.is_empty() || !removals.is_empty() || force_resync {
                let apply_result = if force_resync {
                    sync_index_for_watcher(&app_handle_clone, &vault_path_clone)
                } else {
                    apply_incremental_changes_for_watcher(
                        &app_handle_clone,
                        &vault_path_clone,
                        &upserts,
                        &removals,
                    )
                };

                if apply_result.is_ok() {
                    if force_resync {
                        let _ = app_handle_clone.emit(
                            VAULT_FILE_CHANGED_EVENT,
                            VaultFileChangedEvent {
                                vault_path: event_vault_path_clone.clone(),
                                rel_path: String::new(),
                                kind: "resynced".to_string(),
                            },
                        );
                    }
                    for rel_path in upserts {
                        let _ = app_handle_clone.emit(
                            VAULT_FILE_CHANGED_EVENT,
                            VaultFileChangedEvent {
                                vault_path: event_vault_path_clone.clone(),
                                rel_path,
                                kind: "changed".to_string(),
                            },
                        );
                    }
                    for rel_path in removals {
                        let _ = app_handle_clone.emit(
                            VAULT_FILE_CHANGED_EVENT,
                            VaultFileChangedEvent {
                                vault_path: event_vault_path_clone.clone(),
                                rel_path,
                                kind: "removed".to_string(),
                            },
                        );
                    }
                }

                last_poll = Instant::now();
            }

            thread::sleep(std::time::Duration::from_millis(150));
        }
    });

    let mut handles = watcher_handles()
        .lock()
        .map_err(|_| "failed to acquire watcher lock".to_string())?;
    handles.insert(
        key,
        WatchHandle {
            _watcher: watcher,
            stop,
            join: Some(join),
        },
    );

    Ok(WatcherResult {
        started: true,
        already_running: false,
    })
}

pub fn stop_index_watcher_impl(vault_path: &str) -> Result<WatcherStopResult, String> {
    let vault = canonical_vault_path(vault_path)?;
    let key = vault.to_string_lossy().to_string();

    let mut handles = watcher_handles()
        .lock()
        .map_err(|_| "failed to acquire watcher lock".to_string())?;
    let Some(mut handle) = handles.remove(&key) else {
        return Ok(WatcherStopResult { stopped: false });
    };

    handle.stop.store(true, Ordering::Relaxed);
    if let Some(join) = handle.join.take() {
        let _ = join.join();
    }

    Ok(WatcherStopResult { stopped: true })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn filter_locked_text_preserves_line_count() {
        let source = "# Public\nVisible\n## Secret {locked}\nHidden\nStill hidden\n## Public Again\nVisible 2";
        let filtered = filter_locked_body_content(source);

        let source_lines: Vec<&str> = source.lines().collect();
        let filtered_lines: Vec<&str> = filtered.lines().collect();
        assert_eq!(source_lines.len(), filtered_lines.len());
        assert_eq!(filtered_lines[0], "# Public");
        assert_eq!(filtered_lines[1], "Visible");
        assert_eq!(filtered_lines[3], "");
        assert_eq!(filtered_lines[4], "");
        assert_eq!(filtered_lines[5], "## Public Again");
    }

    #[test]
    fn parse_tasks_skips_fences_and_blockquotes() {
        let text = "- [ ] top\n> - [ ] quoted\n```\n- [ ] fenced\n```\n- [x] done\n- [-] in-progress";
        let tasks = parse_tasks(text);
        assert_eq!(tasks.len(), 3);
        assert_eq!(tasks[0].0, 1);
        assert_eq!(tasks[0].1, ' ');
        assert_eq!(tasks[1].1, 'x');
        assert_eq!(tasks[2].1, '-');
    }

    #[test]
    fn sqlite_schema_and_meta_roundtrip() {
        let dir = TempDir::new().expect("temp dir");
        let db_path = dir.path().join("index.sqlite");
        let conn = open_connection(&db_path).expect("open db");
        ensure_schema(&conn).expect("schema");
        set_meta(&conn, "last_indexed_ms", "123").expect("set meta");
        let value = get_meta_u64(&conn, "last_indexed_ms").expect("read meta");
        assert_eq!(value, Some(123));
    }

    #[test]
    fn to_fts_query_handles_dots() {
        // Test that dots in search terms are properly quoted
        let query = to_fts_query("tp.file").unwrap();
        assert_eq!(query, "\"tp.file\"");
        
        // Test single word without special chars uses prefix matching
        let query = to_fts_query("hello").unwrap();
        assert_eq!(query, "hello*");
        
        // Test multiple words
        let query = to_fts_query("hello world").unwrap();
        assert_eq!(query, "hello* AND world*");
        
        // Test word with dot
        let query = to_fts_query("file.md").unwrap();
        assert_eq!(query, "\"file.md\"");
        
        // Test mixed: word with and without special chars
        let query = to_fts_query("hello file.md").unwrap();
        assert_eq!(query, "hello* AND \"file.md\"");
        
        // Test empty query
        let query = to_fts_query("");
        assert!(query.is_none());
        
        // Test whitespace only
        let query = to_fts_query("   ");
        assert!(query.is_none());
    }
}
