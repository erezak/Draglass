# Entity templates

The Entity templates core plugin is enabled by default and can be disabled in Settings → Core plugins. It owns ontology-based creation, not ordinary notes or their properties. Settings remain two-pane, with an Entity templates category while enabled.

Use **New entity from ontology…** in the command palette (Cmd/Ctrl+Shift+P) or note menu. Choose one of the eleven entity types and its subtype, enter a name, and review the editable Markdown/YAML preview. Create note exclusively creates the selected file and opens it; Cancel writes nothing.

Classification fields are `type` and `subtype`; their property names are fixed and read-only. `kind` is not an entity-classification alias. Source subtypes include GITHUB, SHAREPOINT, CONFLUENCE, GITLAB, AZURE_DEVOPS, ITAP, and evidence material categories. The corrected [Context Service ontology](CONTEXT_SERVICE_ONTOLOGY.md) defines the fields and relationship directions used by the bundled templates.

Templates exist for every registered subtype, with specialized person and organization sections.

Settings → Entity templates customizes a folder and Markdown body for a type or a subtype. Subtype overrides inherit omitted fields from the type rule. Placeholders {{name}}, {{date}}, {{type}} and {{subtype}} expand as text; there is no executable template language. Apply settings persists staged changes; Cancel retains the prior configuration. Use bundled template removes the current override.

Clicking a hollow graph node asks to create that missing entity. Its existing target path is retained so links resolve; named relationships suggest a type/subtype, but the user can choose another. A plain missing wiki link has no asserted classification and starts with a Concept suggestion. Existing source evidence stays on the declaring relationships. Disable the plugin to return to ordinary empty-note confirmation.

New templates use UUID IDs, an initial FQN, common metadata, type-specific fields and an empty relationship collection. Referenced owners/parents/superseded entities belong in relationships with optional source collections. Unknown facts, provenance and confidence remain empty; drafts do not assert ACTIVE or verified status. Files and FQNs are never overwritten or silently merged on a collision.

**Draft with AI…** uses the configured provider and normal reviewed action workflow. The dialog shows checked local notes selected by lexical matches and ontology graph neighbors; refresh that selection after changing the intent and uncheck anything you do not want sent. Only those note snapshots and their compact local relationships are sent, plus your template and instructions. No note needs to exist first. The AI must propose exactly one new note at the requested path and preserve its ID, FQN, type and subtype. You review the result before accepting; accepting is the first note write. This is bounded drafting, not autonomous multi-note editing. Provenance claims still require your review.

Custom entities/relationships can remain in YAML source, although closed visual classification choices use the bundled catalog. Graph node shape and edge kind are internal rendering terms, not the subtype YAML field.
