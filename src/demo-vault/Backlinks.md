# Backlinks

Backlinks answer one question: *which other notes link to this one?*

When you write `[[Backlinks]]` anywhere in the vault, this note gains an incoming link from that file. The **Backlinks** panel in the right sidebar collects all of them automatically.

## Outgoing links

The right sidebar starts with the **Outgoing links** section. This lists every [[Wikilinks|wikilink]] the *current* note contains — in other words, the notes you link *to*. Click any entry to navigate there.

Outgoing links update live as you type new wikilinks.

## Where to find backlinks

Directly below the Outgoing links section you will see **Backlinks** — notes that link *to* the one you are reading. Open the right sidebar with **Cmd/Ctrl + Shift + B** if it is hidden. Each entry is a note that contains a [[Wikilinks|wikilink]] pointing here. Click one to open it.

> [!note] Try it now
> Scroll to the Backlinks panel on the right. Because many notes in this demo vault link to `[[Backlinks]]`, you should see a healthy list. Click any entry to jump there, then use the browser-style back navigation or **Cmd/Ctrl + P** to return.

## How backlinks are computed

Draglass scans the vault in the background using a debounced schedule (configurable in [[Customizing Draglass|Settings]]). The scan reads every `.md` file, extracts wikilinks, and matches them against the current note's title. Because the scan is debounced, it does not slow down typing.

### Locked content

When the vault is locked, links inside [[Privacy and Security|locked sections]] are excluded from backlink results. Unlock the vault to see the complete picture.

## Why backlinks matter

Backlinks surface connections you did not plan ahead of time. You might link to [[Philosophy]] from [[Ancient Greece]], [[Critical Thinking]], and [[Science]] without thinking about it. Open [[Philosophy]] later and the backlinks panel reveals all three references — an emergent map of how that concept fits into your vault.

This pattern is at the heart of Zettelkasten-style knowledge management (see [[Organization Strategies]]).

## Backlinks in the Graph View

Backlinks and outgoing links together form the edges in the [[Graph View]]. A note with many backlinks shows up as a large, well-connected node.

## Related

- [[Wikilinks]] — creating the links that produce backlinks
- [[Graph View]] — visualizing the full link graph
- [[Searching Your Vault]] — another way to discover references
- [[Customizing Draglass]] — tuning the backlinks debounce
