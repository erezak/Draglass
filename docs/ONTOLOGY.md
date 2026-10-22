# Canonical field: type + subtype

New notes and visual classification use `type` and `subtype`. There is no `kind` entity-classification alias. The corrected source is [Context Service Ontology](CONTEXT_SERVICE_ONTOLOGY.md); [entity templates](ENTITY_TEMPLATES.md) are derived from it.

# Extensible note ontology and relationship provenance · 0.13.1

The eleven starting classes follow the Context Service ontology, incorporating the later Repository → Source rename and the shared `subtype` field. The suggestions below extend the original vocabulary for Draglass; they are not closed enums or constraints. Custom classes, kinds and relationship names work. Ordinary notes require none of this metadata. Commitment, Risk and Project remain compatible application conventions, not additions to the eleven core classes.

| Class (`type`) | Meaning | Suggested subtypes (`subtype`) | Typical outgoing relationships |
|---|---|---|---|
| System | Application or business system | application, service, platform, product | implemented_by → Source; composed_of → Component; depends_on / calls → System; owned_by → Identity; governed_by → Policy; supports → Objective |
| Component | Internal architectural element | module, database, queue, layer, container, function, cache, gateway | composed_of → Component; component_of → System/Component; depends_on → Component/System; associated_with → Concept |
| Source | Material supplying information and evidence | git, document, web_page, email, chat, meeting, dataset, m365_report | source_for → any; owned_by → Identity; part_of → Source |
| Concept | Semantic knowledge atom | api, business_term, technology, pattern, interface, requirement, convention, constraint, process_rule, market_insight, business_intelligence, strategic_intent, competitive_analysis | associated_with → System/Component/Concept; sourced_from → Source; depends_on → Concept; supports → Objective |
| Identity | Human, organization or nonhuman actor | person, team, division, company, service_account, mech_id | member_of → team; employed_by → company; reports_to → person; leads → team/division; part_of → Identity; owns → any |
| Behavior | Expected behavior or acceptance specification | scenario, acceptance_criterion, business_rule | implements → Concept; associated_with → System/Component; supports → Capability/Objective; sourced_from → Source |
| DecisionRecord | Point-in-time choice with rationale | architectural, technical, product, organizational | informed_by → Concept/Source; associated_with → System/Component/Identity; supersedes → DecisionRecord; supports → Objective |
| Playbook | Repeatable process or operational know-how | archetype, skill, runbook, sop, pipeline | uses → Concept/System/Component; enforces → Policy; associated_with → Behavior; supersedes → Playbook; sourced_from → Source |
| Policy | Governance obligation or guidance | security, compliance, data_governance, operational, regulation | governs → System/Component/Concept/Behavior; supersedes → Policy; sourced_from → Source; owned_by → Identity |
| Objective | Goal or intent | strategic, tactical, operational | parent_of → Objective; owned_by → Identity; informed_by → Concept/Source |
| Capability | What an organization can do | business, technical | supports → Objective; delivered_by → System; parent_of → Capability; owned_by → Identity; associated_with → Behavior/Concept |

These ranges describe useful patterns, not enforced restrictions. `subtype` is not a lifecycle state. Keep status, confidence, maturity, level, deadline and other attributes separate. Existing HUMAN/person identities and legacy subtype properties are preserved. Behavior retains Given/When/Then intent; DecisionRecord retains point-in-time rationale. Source/GIT represents the earlier Repository class.

## YAML collection

```yaml
---
id: erez
type: identity
subtype: PERSON
relationships:
  - relation: member_of
    target: "[[Teams/ABC]]"
    sources:
      - ref: "[[Sources/Organization chart]]"
        locator: "Engineering / Team ABC"
        quote: "Erez is a member of Team ABC."
      - ref: "https://example.com/team-announcement"
  - relation: reports_to
    target: "[[People/Dana]]"
  - relation: employed_by
    target: company-id
---
An ordinary mention of [[Teams/ABC|the team]] remains unnamed.
```

`target` accepts a wiki path, unique title/alias, stable ID or FQN. Quote wiki links in YAML. `sources` is an optional collection: absent or empty means provenance has not been recorded. Strings and objects are accepted; objects can include ref, locator, quote and additional source metadata. Relationship confidence, dates and other attributes are retained in the original declarations. Draglass never invents confidence or verifies a source just because it is present.

## Relationship vocabulary and inverses

| Relationship | Inverse |
|---|---|
| employed_by | employs |
| member_of | has_member |
| reports_to | manages |
| part_of | has_part |
| leads | led_by |
| owned_by | owns |
| composed_of | component_of |
| implemented_by | implements_system |
| depends_on | dependency_of |
| calls | called_by |
| associated_with | associated_with (symmetric) |
| sourced_from | source_for |
| implements | implemented_in |
| supersedes | superseded_by |
| informed_by | informs |
| uses | used_by |
| enforces | enforced_by |
| governed_by | governs |
| supports | supported_by |
| parent_of | child_of |
| delivered_by | delivers |

Employment, membership, reporting and leadership are distinct facts. Hiring is a historical event and should not replace the ongoing employed_by relationship. Organizational containment uses part_of. Unknown predicates are accepted; without a registered inverse, backlinks label the reverse as “inverse of …”. Underscores display as spaces. Known inverse declarations normalize into one directed edge and union their sources, while retaining every original declaration and origin note. This merges corroborating references, not contradictory facts or confidence scores.

## Graph, backlinks and AI

Graph edges distinguish unnamed wiki references from named YAML relationships. Aliases are display labels, never inferred predicates. A body wiki link and a named relationship between the same notes remain separate edges, as do multiple predicates between a pair. Known inverses are presented without requiring duplicate YAML. Named edges have arrows and labels when focused; select a node to inspect its relationships, evidence and recorded declarations. Backlinks show incoming references and inverse relationship names, with the same evidence. Local Source references in relationship evidence also appear as evidence backlinks; they do not imply employment, ownership or any other fact.

The local AI graph retains sources and declarations in its selected context. New AI actions are instructed to use these YAML collections and cite supported evidence. Legacy scalar/list relationship fields remain readable without automatic note migration; older belongs_to edges remain labelled as written. Missing and ambiguous references appear as hollow nodes; malformed collections are diagnosed in graph inspection. No existing target is guessed. Missing typed targets appear as hollow graph nodes. Relationship collections can be edited visually; other nested collections remain available in YAML source mode.

The graph is derived from notes and refreshes after saves/external changes. Graph controls filter what is visible; note inspection retains its full relationship evidence. No automatic inference of predicates from prose or link aliases is performed. Local sources can be opened from inspection; external references can be copied.

## Visual editing · 0.14.0

The Properties section now includes a relationship list and **Add relationship**. Choose a predicate, select a target note or enter a future target, then add optional evidence sources. Source references accept note selections or URLs; location and supporting excerpt are editable. Existing relationship confidence, extra provenance fields and neighboring note metadata are retained. Click a relationship to edit or delete it. Applying the relationship uses normal editor undo and autosave; Cancel makes no note changes. If the relationship collection or active note changes while its dialog is open, reopen the dialog to avoid overwriting newer data. YAML comments inside a changed collection may be normalized by serialization; YAML anchors remain source-edit-only.

`Type` and `Subtype` are property types alongside Text, List and Number. Type offers the eleven entity classes; Subtype offers the subtypes for the current note's entity type. Changing the main entity type clears an incompatible subtype rather than inventing a subtype. Existing custom/legacy values remain visible; new dropdown choices use the predefined catalog. YAML source remains available for extended vocabularies. The Properties heading collapses or expands the section, remembered per vault.

Missing relationship targets and missing evidence notes now appear as hollow graph nodes, matching ordinary missing wiki targets. They remain in the graph with their labels, direction and provenance; they are not selected as existing-note AI context. Creating the referenced note converts the node to a normal existing node on refresh. Ambiguous IDs have separate hollow placeholders so no candidate is assigned arbitrarily; select a full target path in the relationship editor to disambiguate them.

Hover details remain available while moving into the info pane. Cmd-click (Mac) or Ctrl-click (other platforms) pins node details without opening the note. Find a node also pins its details. Use Pin/Unpin details, the dismiss button or Escape to release the pane. A normal click on a hollow note node asks whether to create its referenced Markdown note; Cancel creates nothing. Confirm creates a new file exclusively, creating its parent folder if needed, and opens it. Existing files are never overwritten by this action. Missing-node backlink entries offer the same creation flow.

The editor uses a drawn, theme-aware caret. Opening a note or switching to Live Preview moves a cursor that would be hidden inside collapsed YAML into the visible note body.
