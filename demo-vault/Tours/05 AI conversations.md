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

Open [[Systems/Beacon service]], then use the chat panel. The current note is included automatically. Type `@` to mention [[Policies/Observation retention]] and [[Sources/Design review]]. Context chips show which notes are being sent, including their Markdown and YAML metadata. Try asking: “Explain how Beacon supports trustworthy observations, and separate the evidence from assumptions.”

## Conversations without an open note

Close all note tabs. Chat still works; type `@` to include existing notes. **New conversation** starts with empty history and preserves earlier chats in the selector. Note and workspace conversations are separate.

## Propose a change

Choose **Propose changes**, mention the relevant notes, and ask for a clearer description. Review the rendered note, Before, Changes and Source views. Accept or reject per note; accepted actions have an undo operation. Actual output depends on your provider and its configured limits.

Open [[Tours/06 Diagrams and drawings]] next.
