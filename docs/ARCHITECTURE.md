# Local application architecture · 0.19.0

## Ownership and execution

| Layer | Owns | Execution |
| --- | --- | --- |
| Renderer (`ui/`) | Editor state, unsaved text, selections, DOM/canvas rendering, graph filtering and force animation | Sandboxed browser/UI thread; no Node filesystem or provider secrets |
| Preload (`electron/preload.cjs`) | Explicit operation bridge | Context-isolated Electron preload; no general-purpose execution endpoint |
| Desktop shell (`electron/main.cjs`) | Windows, dialogs, asset protocol, file-open routing, watcher notifications, IPC validation, mutation queue and AI service lifetime | Electron main process |
| Knowledge service (`core/backend/client.cjs`) | Requests, cancellation, worker lifetime, timeout, failure propagation and isolation by vault | Electron-independent Node client; uses `worker_threads` |
| Knowledge worker (`core/backend/worker.cjs`, `index.cjs`) | Incremental content index, search metadata, query execution, tags, backlinks, visual graph construction and bounded derived-view cache | One Node worker per active vault |
| Existing domain modules (`core/`) | Validated paths, Markdown/YAML semantics, ontology, links, safe writes, file organization, AI protocols and persistence | Reused by their owning service or renderer as appropriate |

`core/` identifies reusable code, not a process. Search and tag computation no longer run in the renderer. Graph construction now runs in the worker; rendering, filtering and force simulation still run in the renderer. The raw graph snapshot endpoint remains for embeds, AI entity drafting and evidence navigation. Those callers are follow-up opportunities, not migrated services.

## Query contract

`KnowledgeService(root)` supports `request(method, args, {signal})`, `latest(channel, method, args)` and `close()`. The service has no dependency on Electron. Methods are `scan`, `folders`, `resources`, `graph`, `search`, `tags`, `backlinks` and `graphModel`; unknown operations reject. Worker messages carry a request ID, operation and data; replies carry the same ID and either a result or an error message. Filesystem and mutation APIs are not exposed through this worker protocol.

Search receives query, sort and a sparse list of unsaved drafts. Each draft contains path, Markdown and the editor's saved version. Drafts are request-scoped overlays on existing indexed notes, never file writes or a second persisted vault. The saved version is context only; it does not authorize a write or suppress external refresh. Search and tag responses contain result metadata, not the entire vault. Limits: 64 drafts, 8 MiB-equivalent source character guard per draft plus a 32 MiB total byte limit; note files retain the existing 8 MiB disk limit.

The renderer uses independent generation counters for searches and tags and resets them on vault changes. A new search cancels the earlier client request on its channel. Cancellation rejects pending callers promptly and discards late replies; the worker skips queued cancelled requests when possible. Already-running synchronous computation, including regex evaluation, cannot be interrupted by a cancellation message. A 30-second request timeout bounds caller waiting but does not forcibly interrupt the worker. Stronger execution budgets and regex isolation remain future work.

## Index and consistency

`Vault.scan` serializes scans per instance and retains file text/content hashes when mtime, ctime, size and inode are unchanged. A scan walks directories and stats entries; it reads/hashes only added or changed note files. Deleted paths leave the cache after a successful scan. All new snapshots replace the old snapshot only after the traversal succeeds. Metadata-only changes also advance the knowledge revision. Derived graph caches are invalidated on index changes and bounded to four views. Parsed search properties/tags are reused while note text is unchanged, including request-scoped draft text.

This is an in-memory index, rebuilt after restart. Directory traversal/stat work is still proportional to vault size. Watchers notify the UI; periodic reconciliation remains a correctness fallback. It is not yet an event-maintained persistent index. Files changing during a traversal can cause a failed query; callers can retry or wait for the next reconciliation. No guarantee of a transactional snapshot across arbitrary external writers is claimed.

Knowledge reads bypass the desktop mutation queue, so an outstanding search does not hold up autosave. Note reads and writes retain the existing ordered bridge path. Safe writes use temporary files, atomic replacement and recovery snapshots. Renames, moves and AI action application remain reviewed domain operations on that path. A query concurrent with a mutation can reflect an earlier snapshot; watcher/reconciliation refreshes correct the view. The worker never writes user notes.

## Lifecycle, packaging and scope

A candidate vault is indexed before replacing the active service. Switching vaults terminates the old worker and rejects its pending requests; shutdown terminates the active worker. Idle workers are unreferenced so they do not keep the app alive. A worker failure rejects pending requests; the next request starts a fresh worker and rebuilds its index. No automatic retry replays a mutation. Worker code is included by the existing `core/**` application packaging rule.

Provider credentials, proxy configuration and AI orchestration remain in the existing Node main-process services. This slice adds no Rust, remote backend, HTTP listener, database or new dependency. A later slice can move AI orchestration, mutation planning and graph physics behind independent service interfaces. Native packaged Electron/ASAR worker behavior on macOS, Windows and Linux still requires target-platform verification.

## Workspace containers and views

`core/workspace-tree.cjs` owns a serializable tree. A split contains two containers, a direction and a resize ratio. A tab group contains view leaves and its selected view ID. Nesting creates rows within columns or columns within rows; closing a group collapses its redundant parent. Container and view IDs are independent of file paths.

Each note or drawing leaf carries its file path, pin state, reading mode, scroll positions and bounded navigation history. A view references a canonical application buffer at runtime. The buffer holds file content, editor state, shared undo history, pending saves and disk version. Opening the same file in another group creates another view of that buffer; closing a view releases the buffer only when no other view needs it. Clean unused navigation buffers can be evicted and reread. File moves update view paths and navigation history.

`ui/workspace-view.js` renders the container tree and manages group focus, independent toolbars, tab membership, drag/drop, nested splits and resizing. `ui/app.js` coordinates document loading, autosave and service calls. Existing note services use an active-group adapter: canonical DOM identifiers follow focus, and the properties editor moves to the selected surface. This adapter is a compatibility boundary, not the persisted workspace model. It can be replaced service by service without changing the tree schema.

The graph service currently owns one shared viewport, hosted by a selected group. It can remain beside other editable notes. Multiple independent graph instances, stacked tab presentation and restoring layouts across detached windows are follow-up extensions; this change does not claim them.

`WorkspaceStore` and `SavedWorkspaceStore` persist sanitized layout metadata, never buffers, note bodies, credentials or conversations. Saved layouts are vault scoped, atomically written and limited to 32. Tree normalization bounds containers, views, depth, path lengths, ratios and history; removes unknown fields; and makes IDs unique. Earlier flat and two-pane layouts are accepted as input and become trees when opened. Restoring flushes drafts, reads current files, skips unavailable targets and reconstitutes groups and selected views. Backend indexing and file mutation boundaries remain unchanged.
