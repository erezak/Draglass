# pnpm workflow · 0.17.1

Use your installed pnpm. There is no exact pnpm version or pnpm engine range in the project manifest, no packageManager field, and no devEngines.packageManager declaration. The workspace sets pmOnFail: ignore so pnpm does not switch to a project-selected tool version. It contains no registry or credential settings.

The committed pnpm-lock.yaml records application dependencies, not a required pnpm executable version. It was imported from the previous npm lockfile, and all direct dependency resolutions were checked against that lockfile. Existing dependency overrides and lifecycle-script decisions were transferred into pnpm-workspace.yaml. No dependencies were upgraded as a migration goal.

Use a current pnpm that supports the workspace settings. No specific release is mandated. The migration was tested with pnpm 11.25.0; that version is a verification record, not a project requirement. Existing Node requirements remain unchanged.

## Commands

From a freshly extracted project folder:

    pnpm install --frozen-lockfile
    pnpm start

Checks:

    pnpm test

Build only the macOS application:

    pnpm run dist:mac:app

Build the DMG:

    pnpm run dist:mac:dmg

Other existing targets:

    pnpm run dist:mac
    pnpm run dist:win
    pnpm run dist:linux

The app-only script uses electron-builder --mac --dir. On an Apple Silicon Mac its output is normally release/mac-arm64/Draglass Editor.app. Quit the old application before copying the new .app into /Applications.

If extracting over an older npm checkout, move the old node_modules directory and package-lock.json aside first. Do not copy old modules into the new folder. Preserve your registry and authentication configuration. Routine installs use --frozen-lockfile; use pnpm install without that flag when deliberately updating dependencies and committing the resulting lockfile.

## Installation and packaging behavior

Electron needs a physical node_modules tree for packaging. nodeLinker: hoisted supplies it. electron, esbuild and electron-winstaller have explicit build approval; @parcel/watcher and fsevents retain their prior blocked-script decisions. No blanket build-script approval is enabled.

Every project script builds through Node directly. There are no nested npm invocations and no script that installs or pins pnpm.

Verification installs in Linux used ELECTRON_SKIP_BINARY_DOWNLOAD=1 because no native Electron launch or Mac packaging could be exercised there. Do not set that variable for your normal Mac install; Electron’s approved installation downloads its runtime.

References:
- https://pnpm.io/cli/import
- https://pnpm.io/settings/cli
- https://pnpm.io/settings/build
- https://www.electronjs.org/docs/latest/tutorial/tutorial-first-app

## Verification

A fresh frozen-lockfile installation succeeded, pnpm test passed all 288 tests, and both renderer entries and the diagram bundle built. electron-builder's actual pnpm production-dependency collector found all direct runtime dependencies. The hoisted layout, absence of a pnpm version pin and absence of nested npm commands were checked explicitly. Native macOS packaging still runs on your Mac.
