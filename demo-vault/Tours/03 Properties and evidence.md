---
tags:
- demo/tour
demonstrates:
- properties-ontology
priority: 2
reviewed: false
review_date: 2026-10-22
observed_at: 2026-10-22T09:00:00
reviewers: [Mara, Imani]
short_note: Editable property examples
---

# Turn a note into a knowledge entity

Expand this note's Properties section to try text, list, number, checkbox, date and time values. Open [[Systems/Beacon service]] to inspect its entity classification and relationships. Choose a property to edit; use the property controls to add a value. Switch the property display between visual fields, hidden fields and YAML in Settings.

The fields **type** and **subtype** have selectable values. Their property names are fixed. This story includes all eleven ontology types: Identity, Objective, Capability, System, Component, Source, Concept, Behavior, DecisionRecord, Playbook and Policy.

## Relationships carry evidence

Beacon is owned by [[Teams/Platform team]], includes [[Components/Sensor gateway]] and is governed by [[Policies/Observation retention]]. These connections live in its YAML relationships collection, with named predicates and optional sources.

Use **Add relationship** to choose a predicate, a target and source references. Open an existing relationship to inspect its source location and quote. [[Sources/Design review]] holds the fictional recorded assertions. Backlinks show incoming relationships and inverse labels, not just ordinary links.

Compare [[People/Mara Chen]] with [[People/Noam Levi]] in the graph: one uses a person silhouette and one uses a local illustration.

Open [[Tours/04 Explore the graph]] next.
