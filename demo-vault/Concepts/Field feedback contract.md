---
id: lumen-032
fqn: demo.lumen.concept.field-feedback-contract
type: Concept
subtype: INTERFACE
description: The portal reports accepted, rejected or pending readings.
tags:
- lumen/concept
relationships:
- relation: associated_with
  target: '[[Systems/Field portal]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Field feedback contract associated with Field portal.
- relation: sourced_from
  target: '[[Sources/Design review]]'
---

# Field feedback contract

The portal reports accepted, rejected or pending readings.

All names, organizations and evidence in this scenario are fictional.

## Explore

Follow [[Concepts/Idempotent intake]] or return to [[Welcome]]. Open the local graph to compare wiki links with named property relationships.

## Response fields

The response carries a status, an observation ID and a source identifier.

A source identifier is required for traceability. ^source-rule
