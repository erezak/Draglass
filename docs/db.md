# Draglass Vault Index Database

## Canonical source of truth

Markdown files in the vault remain canonical.
The SQLite database is an index/cache that can be rebuilt safely at any time.

## Location

- Desktop app storage only (outside the vault).
- One SQLite file per vault (vault path hash keyed).

## Schema

Current schema version: `1`

### `meta`

- `key TEXT PRIMARY KEY`
- `value TEXT NOT NULL`

Used keys:
- `schema_version`
- `last_indexed_ms`

### `notes`

- `note_id INTEGER PRIMARY KEY`
- `rel_path TEXT UNIQUE NOT NULL`
- `title TEXT NOT NULL`
- `mtime_ms INTEGER NOT NULL`
- `size_bytes INTEGER NOT NULL`
- `content_hash TEXT`
- `body_public TEXT NOT NULL` (locked ranges removed)
- `body_full TEXT NOT NULL`
- `is_hidden INTEGER NOT NULL`
- `indexed_at_ms INTEGER NOT NULL`

### `fts_public` (FTS5)

Indexed search over public content:
- `note_id UNINDEXED`
- `title`
- `body`
- `rel_path`

### `fts_full` (FTS5)

Indexed search over full content:
- `note_id UNINDEXED`
- `title`
- `body`
- `rel_path`

## Rebuild and migration rules

- If DB is missing, create and rebuild.
- If schema is incompatible/corrupt, remove and rebuild.
- Rebuild is safe because files remain canonical.

## Lock and visibility semantics

- When vault is locked: search/derived features use `body_public`.
- When vault is unlocked: search/derived features use `body_full`.
- `showHidden=false` excludes rows where `is_hidden=1`.

## Index update paths

- Full/incremental sync from vault scan.
- Direct `upsert_note` / `remove_note` commands used by write/create/rename/delete flows.

## Watcher lifecycle

- `start_index_watcher(vaultPath)` starts a recursive filesystem watcher for that vault.
- Watch events are debounced in-process and trigger re-sync.
- A fallback polling pass runs periodically (30s) in case watcher events are dropped by the platform.
- `stop_index_watcher(vaultPath)` stops background watcher/polling for that vault.
