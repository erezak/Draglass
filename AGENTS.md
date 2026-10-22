# Draglass development

- Use pnpm and the authoritative pnpm-lock.yaml. Do not pin or auto-download a pnpm version.
- Keep Excalidraw pinned at 0.18.1 unless the owner explicitly requests an upgrade. Its version is independent of Draglass and the drawing file format.
- For every added, changed or deleted user feature, update the relevant demo-vault tour/examples and assets/demo-manifest.json in the same change. Remove obsolete instructions and include a real example or an honest guided exercise. Do not fabricate AI/provider results or native integration success.
- Run pnpm run check:demo and checks appropriate to the feature. The normal build also validates the demo. Extend coverage checks when a new feature category is introduced; do not reduce graph/coverage thresholds to conceal a failure.
- Preserve editable demo editions and normal user vaults. The content fingerprint selects new bundled editions; no application version bump is needed just to refresh example content.
- README describes the product, setup and usage. Keep archive delivery, chat handoff and Git-history commentary out of it.
- Keep project text focused on Draglass. Preserve third-party license notices unchanged. Keep roadmap and architecture notes current.
- Do not include dependencies, local settings, QA captures or Git history in source deliveries.
