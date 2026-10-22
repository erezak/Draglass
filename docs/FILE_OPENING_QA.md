# File opening verification · 0.17.0

The complete automated suite passed 287 tests on Linux with Node 24.19.0. Renderer and diagram bundles build, and electron-builder validates the packaging configuration. No dependencies were added or changed.

New filesystem tests cover canonical vault containment, similarly named adjacent directories, symlinks, supported file types, uppercase extensions, multiple command-line files, file URIs, cold and warm queue ordering, failed-open continuation, relative links, fragments, extension ambiguity, rejected schemes, detached atomic autosave, external replacement, separate recovery storage, scoped embeds and drawing-edit authorization.

An Electron host test runs the real main-process routing with mocked Electron windows/IPC and real filesystem documents. It verifies restoration before cold opens, early macOS events, later launches, detached window reuse, writes to the correct external file, unchanged vault workspace state, cross-window IPC rejection and window close behavior.

Detached DOM integration tests cover visible mode labels and full paths, original-file autosave, local/missing/web links, external updates replacing pending edits, failed saves preventing close, Excalidraw change callbacks using the normal save path, and document overflow layout. The diagram runtime is mocked in these DOM tests.

Native Finder/Explorer/desktop association registration, signed installers, real macOS/Windows launch delivery, and OS-level scrollbar appearance still require an installed build on those platforms. The Linux tests do not establish those native behaviors.

A final focused run passed the seven filesystem/desktop tests and four detached DOM tests, including an additional standard heading-anchor regression. A real headless Chromium run with a simulated desktop bridge verified detached Markdown autosave, light/dark rendering, a 60-column table and 100 paragraphs. The detached document scrolled within a 1105×594 viewport over 5708×4797 content; the vault document scrolled within a 473×678 viewport over 5605×4951 content. Both axes were programmatically scrolled and checked. No browser page errors occurred. Browser screenshots were inspected for layout; they are internal QA artifacts. These browser checks do not exercise the native OS file-association registry or real Excalidraw drawing interaction; drawing autosave in the new window is covered with a stubbed drawing runtime in DOM tests.
