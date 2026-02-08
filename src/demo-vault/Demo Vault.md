# Demo Vault

The demo vault is a built-in, interactive guide that ships with every copy of Draglass. It opens automatically the first time you launch the app, and you can return to it at any point from the Command Palette (**Cmd/Ctrl + Shift + P → Open Demo Vault**).

## Why a demo vault?

Most apps document their features in a help site or a PDF. Draglass takes a different approach: its documentation *is* a vault. Every note you are reading right now is a real Markdown file rendered by the same editor, wikilinks, backlinks panel, graph view, and task scanner that you will use in your own vaults. There is nothing to imagine — the features are working right in front of you.

This means you can:

- **Edit freely** — change any note, add your own, delete what you don't need. The demo vault resets each time the app is updated, so there is nothing to break.
- **Follow links** — click any [[Wikilinks|wikilink]] to jump between notes and watch the [[Backlinks]] panel update in real time.
- **Explore the graph** — open the [[Graph View]] to see how every topic in this vault connects to every other topic.
- **Try every feature** — [[Live Preview]], [[Locked Sections]], [[Tasks and Checklists]], [[Searching Your Vault|Global Search]], the [[Quick Start Guide|Quick Switcher]] — they all work here the same way they do in a real vault.

## How it works

On the **desktop app** (Tauri), the demo vault files are embedded into the binary at compile time and written to your app data folder the first time you open them. A version stamp ensures that new files added in future releases appear automatically.

On the **web version**, the files are bundled directly into the JavaScript at build time, so the demo vault loads instantly with no network requests.

In both cases, the content is local and private — nothing is fetched from a remote server.

## Returning to the demo vault

If you have opened your own vault and want to come back here:

1. Open the Command Palette (**Cmd/Ctrl + Shift + P**).
2. Choose **Open Demo Vault**.

Draglass remembers your last-used vault, so switching between the demo vault and your own is seamless.

## What's inside

The notes in this vault fall into two groups:

1. **Feature notes** — [[Creating Notes]], [[Wikilinks]], [[Backlinks]], [[Graph View]], [[Live Preview]], [[Locked Sections]], [[Tasks and Checklists]], [[Searching Your Vault]], [[Markdown Syntax]], [[Privacy and Security]], [[Daily Notes]], [[Customizing Draglass]], [[Organization Strategies]], [[Workflow]], and this note.
2. **Topic notes** — [[Philosophy]], [[Science]], [[History]], [[Technology]], [[Literature]], [[Mathematics]], [[Computer Science]], [[Education]], [[Ancient Greece]], [[Enlightenment]], [[Critical Thinking]], [[Political Theory]], and [[Innovation]].

The topic notes exist so the vault feels like a real knowledge base, not a feature checklist. They are linked to each other and to the feature notes, creating the kind of interconnected graph that Draglass is designed for.

## Related

- [[Welcome to Draglass]] — the landing note for new users
- [[Quick Start Guide]] — keyboard shortcuts and first steps
- [[Customizing Draglass]] — change the demo vault experience with settings
