# Wikilinks

Wikilinks are the primary way notes in Draglass connect to each other. Wrap a note title in double brackets and you have a link:

```markdown
[[Philosophy]]
```

Click [[Philosophy]] in [[Live Preview]] mode (or in Source mode) and Draglass opens that note. If the note does not exist yet, Draglass creates it — so typing a wikilink is also a way of [[Creating Notes|creating a new note]].

## How links are resolved

Draglass strips the `.md` extension and matches case-insensitively against relative file paths in the vault. This means `[[Philosophy]]` resolves by matching the note title, regardless of case.

You can also use a **display alias** separated by a pipe:

```markdown
[[Philosophy|philosophical questions]]
```

This renders as "philosophical questions" but still links to [[Philosophy]].

## Outgoing and incoming links

Every note has two kinds of links:

- **Outgoing links** — the wikilinks you write in the current note. These appear in the **Outgoing links** section of the right sidebar.
- **Incoming links (backlinks)** — other notes that link to the current note. These appear in the **Backlinks** section. See [[Backlinks]] for the full story.

Look at the right sidebar now — you should see every note that mentions `[[Wikilinks]]`.

## Wikilinks in the Graph View

Each wikilink becomes an edge in the [[Graph View]]. A note with many outgoing links appears as a hub; a note with many incoming links appears as a popular destination. The graph makes the link structure visible at a glance.

## Best practices

1. **Link generously** — even a loose connection is worth creating. You can always refine later.
2. **Use clear note titles** — the title *is* the link target, so descriptive names make linking easy.
3. **Click broken links on purpose** — if you type `[[New Idea]]` and the note does not exist, clicking the link creates it. This is the fastest way to start a new note.
4. **Check backlinks** — after writing, glance at the right sidebar. You may discover connections you did not expect.

## Try it yourself

- [ ] Type `[[My Test Note]]` somewhere in a note and click it to create a new note
- [ ] Open the right sidebar and scroll to the Backlinks section on any note
- [ ] Open the [[Graph View]] and hover over a node to see its connections

## Related

- [[Backlinks]] — the other side of the link
- [[Graph View]] — visualizing the web of links
- [[Searching Your Vault]] — find notes without a direct link
- [[Quick Start Guide]] — navigation overview
