---
tags:
- demo/tour
demonstrates:
- ai
---

# Ask questions about your knowledge

AI is optional. This demo does not send any requests automatically, create fake model replies or configure credentials.

## Connect a provider

Open Settings → AI providers. You can configure API providers or a gateway, or detected Copilot, Codex or OpenCode tools. API connections support model selection, custom URLs, HTTP headers and Chat Completions or Responses where applicable. Network settings provide proxy configuration. CLI connections need installation and sign-in outside the demo.

## Discuss a note

Open [[Systems/Beacon service]], then use the chat panel. The current note supplies a reference path. Relevant content is fetched through tools when needed. Type `@` to mention [[Policies/Observation retention]] and [[Sources/Design review]]. Reference chips guide exploration; note bodies and the full vault title list are not preloaded. The model can search properties, inspect headings, read sections, and follow sourced relationships. Watch the one-sentence progress messages, then click a verified citation to open its source lines. Try asking: “Explain how Beacon supports trustworthy observations, and separate the evidence from assumptions.”

## Conversations without an open note

Close all note tabs. Chat still works; ask about the vault or type `@` to reference existing notes. **New conversation** starts with empty history and preserves earlier chats in the selector. Note and workspace conversations are separate.

## Propose a change

Choose **Propose changes**, mention the relevant notes, and ask for a clearer description. Review the rendered note, Before, Changes and Source views. Accept or reject per note; accepted actions have an undo operation. Line changes require a read revision; later edits block stale application. Discussion mode cannot stage writes. Actual output depends on your provider and its configured limits.

## Keep requests bounded

In AI provider settings, set **Context window (tokens)** to your model’s supported size or lower. The total request includes instructions, history, tool schemas and results, with response space reserved. Search results, metadata, relationships and line reads are paginated. Older results may be retired and conversation excerpts compacted with a status notice. If essential input is too large, the request stops with an explanation.

Try asking, without mentioning every note: “Find Beacon’s dependencies, explain their evidence, and cite the relevant notes.” Then choose **Propose changes** and ask for a one-paragraph clarification to a relevant section. Accept only after reviewing the preserved surrounding text; try Undo afterwards. No provider output is fabricated by this demo.

## Ask for schema guidance

Try: “Use `inspect_ontology` to explain Identity/PERSON and the member_of relationship, including its inverse and a small sourced YAML example.” The model can fetch only the relevant type, properties or relationship page. These are schema suggestions and illustrative examples, not facts about your notes. Custom predicates remain supported. Ontology inspection works even before opening a vault.

## Ask what time it is

Try: “Use `get_current_time` to tell me today’s date in my local timezone and in UTC.” The tool reads the device clock fresh when called; it also reports the weekday and current UTC offset, including daylight-saving changes. It works without a vault. You can request another IANA timezone such as Asia/Jerusalem, or UTC.

For relative dates, try: “Check the current time, then find notes modified today in UTC.” The model should call the clock again in a new turn, rather than assuming an earlier answer is still current. Date lookup uses UTC calendar days; a local day can cross two UTC dates.

## Find notes by date

Try: “Use `find_notes_by_date` to find notes whose observed_at YAML date is October 1, 2026, then read the Design review.” [[Sources/Design review]] has `observed_at: '2026-10-01'`, providing an actual fixture for this exercise.

You can also ask for filesystem creation/modification dates, another YAML date property such as created_at, or a YYYY-MM-DD date in a filename. The model receives paginated references and dates first, and reads content separately. Ranges include both UTC calendar days. Filesystem modification dates do not identify event dates, and creation time can fall back to modification time on filesystems without it. Tell the model which basis you mean; for local-day boundaries, account for your timezone explicitly.

Open [[Tours/06 Diagrams and drawings]] next.

## Semantic task proposals

With Tasks enabled, ask the assistant to query open tasks and use `read_task` for one action. In Propose changes mode it can use `create_task`, `update_task`, `complete_task` or `promote_task`. These tools prepare changes for review and do not write files. Accepting a task operation applies all its affected files together; Undo uses the same durable history as manual task operations. See [[Tours/12 Tasks]].

**Discuss (read-only)** searches and explains without proposing edits. After a reply, **Enable changes for this request** selects Propose changes and fills the same request for you to send. Files change only after you accept a proposal.

## Session access and right-side tools

Use the Chat icon on the far-right rail. The session starts with **Read-only session** visible above the conversation. Ask for a suggested improvement, then choose **Enable changes for this request**. The same conversation now shows **Read-write · changes require review**. Send the request and inspect the proposal before accepting it. **Enable changes** also switches modes without filling or sending a request. Return to Discuss in the Mode selector to restore read-only tools.

Use the Backlinks icon to inspect incoming links, then the Tasks icon to view actions. Collapse the right sidebar and click any of these icons to reopen its panel. Focus an icon and use Up/Down, Home or End to switch panels. Disabling Tasks hides its icon.
