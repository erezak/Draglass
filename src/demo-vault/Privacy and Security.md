# Privacy and Security

Draglass is built around a simple promise: **your notes stay on your device**. There is no account to create, no sync server, and no telemetry. Every note is a plain Markdown file in a folder you control.

## Local-first design

- Notes are read from and written to a vault folder on your filesystem.
- Settings are stored in your browser's `localStorage` (or the Tauri app's local storage). Nothing is sent over the network.
- The app works entirely offline.

> [!note] Plain files, full control
> Because your vault is just a folder of `.md` files, you can back it up, version-control it with Git, or move it between machines however you like. Draglass never locks you in.

## Locked sections

Sometimes a note contains sensitive information — a private reflection, credentials, personal details — alongside content you are happy to share on-screen.

Draglass lets you mark any heading as **locked** by adding `{locked}` to the heading line. See [[Locked Sections]] for the full details on scope, inheritance, password setup, and how locked content interacts with search and backlinks.

Here is a quick example:

```markdown
## My private thoughts {locked}

This paragraph and everything under the heading is hidden
until the vault is unlocked with the correct password.
```

### How locking works

1. A heading with `{locked}` hides all body content below it until the next heading of the same or higher level.
2. Nested sub-headings inherit the lock from their parent.
3. While the vault is locked, hidden content is excluded from [[Backlinks]], the [[Tasks and Checklists|task scanner]], and [[Searching Your Vault|Global Search]] results.

You can add the marker manually or use the Command Palette command **Lock Current Heading** (place your cursor inside the section first).

### Unlocking the vault

The first time you lock content you will be asked to **set a vault password**. The password is never stored — only a salted hash derived via a Rust-based key derivation function is kept. To reveal hidden sections:

1. Open the Command Palette (**Cmd/Ctrl + Shift + P**).
2. Choose **Reveal Private Sections** and enter your password.

Unlocking lasts for the current session. When you close and reopen Draglass the vault locks again automatically.

### Changing your password

Use the Command Palette command **Change Vault Password**. You will need to enter your current password first.

### Locking again

Choose **Hide Private Sections** in the Command Palette to re-lock immediately without restarting.

## Ignored files

Draglass automatically hides dotfiles (`.git`, `.obsidian`, etc.), `node_modules`, and `.DS_Store` from the file tree and search. You can reveal them by enabling **Show hidden/ignored paths** in [[Customizing Draglass|Settings]].

## Related

- [[Locked Sections]] — full guide to locked headings, vault passwords, and fold toggles
- [[Customizing Draglass]] — the Settings screen where many of these options live
- [[Creating Notes]] — how notes are created and stored as plain files
- [[Tasks and Checklists]] — how locked content is excluded from the task scanner
