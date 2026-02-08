# Locked Sections

Locked sections let you keep sensitive content — private reflections, credentials, personal details — inside a note while hiding it from view until you authenticate with a vault password.

## Marking a heading as locked

Add `{locked}` to any ATX heading line:

```markdown
## My private thoughts {locked}

This text is hidden until the vault is unlocked.
Nested headings below are locked too.
```

In [[Live Preview]], the `{locked}` marker is stripped from the displayed title and replaced with a padlock icon. In Source mode the marker stays visible so you can edit or remove it.

## Scope and inheritance

- A locked heading hides **all body content** from that heading down to the next heading of the same or higher level.
- **Nested sub-headings** inherit the lock from their parent — you don't need to tag each one individually.
- A single note can contain any number of locked and unlocked sections side by side.

### Example

```markdown
## Public notes

This paragraph is always visible.

## Journal {locked}

Everything here is hidden…

### Dreams

…including this sub-heading and its content.

## Another public section

Visible again — the lock ended at the same-level heading.
```

## Setting a vault password

The first time you lock a heading you will be prompted to **set a vault password**. Draglass never stores your password in plain text — it derives a salted hash using a Rust-based Argon2id key derivation function and keeps only the hash.

> [!warning] Remember your password
> There is no password recovery mechanism. If you forget your vault password the locked content remains inaccessible.

## Unlocking and re-locking

| Action | How |
|---|---|
| Reveal hidden content | Command Palette → **Reveal Private Sections**, then enter your password |
| Re-lock immediately | Command Palette → **Hide Private Sections** |
| Automatic re-lock | Close the app — unlock state is session-only and never persisted |

While the vault is unlocked, each locked section shows a **fold toggle** (chevron) so you can collapse or expand individual sections without locking the whole vault again.

## How locked content is excluded

When the vault is locked, Draglass excludes locked body text from several features to prevent accidental exposure:

- **[[Backlinks]]** — links inside locked sections are not shown in the backlinks panel.
- **[[Searching Your Vault|Global Search]]** — locked text is omitted from search results.
- **[[Tasks and Checklists|Task scanner]]** — tasks inside locked sections are hidden from the task list.

Once you unlock the vault, all of these features include the full content again.

## Changing your password

Open the Command Palette and choose **Change Vault Password**. You will need to enter your current password first, then provide and confirm the new one.

## Live Preview rendering

In [[Live Preview]] mode, locked sections display a placeholder with a padlock icon and a "Click lock to reveal" hint. After authenticating, the content fades in and becomes editable. Locked body lines receive a subtle accent stripe so you can see at a glance which parts of the note are protected.

## Tips

- Lock entire sections, not individual lines. The smallest lockable unit is a heading and its body.
- Combine locked sections with [[Organization Strategies|folder organisation]] — keep a "Private" folder of notes that are entirely locked, or mix locked and public sections within topic notes.
- Use Source mode to quickly scan a note for `{locked}` markers if you need to audit what is hidden.

## Related

- [[Privacy and Security]] — the broader local-first promise and ignored files
- [[Live Preview]] — how the padlock and fold UI render in the editor
- [[Customizing Draglass]] — settings that affect locked section behaviour
- [[Demo Vault]] — the interactive guide you are reading now
