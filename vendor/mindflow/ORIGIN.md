# Mindflow canvas

The TypeScript files in this directory come from [Mindflow's framework-independent canvas package](https://github.com/dimkinv/mindflow/tree/a607c58ece3dd9255d6c9de5485775d595ba9e86/packages/mindmap) by Danny (dimkinv), at commit `a607c58ece3dd9255d6c9de5485775d595ba9e86`. Bundled with the author's permission, as confirmed by the Draglass maintainer.

Draglass bundles only the canvas and its model, with no server, accounts, database or collaboration transport. Its local changes to `editor.ts` add Fit, a fit-on-open option and fit-aware resizing; the host adapter supplies note storage, read-only preview and theme styling.
