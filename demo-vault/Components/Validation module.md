---
id: lumen-022
fqn: demo.lumen.component.validation-module
type: Component
subtype: MODULE
description: Checks schema, units and source identifiers.
tags:
- lumen/component
relationships:
- relation: depends_on
  target: '[[Components/Observation store]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Validation module depends on Observation store.
- relation: owned_by
  target: '[[People/Mara Chen]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Validation module owned by Mara Chen.
- relation: sourced_from
  target: '[[Sources/Design review]]'
---

# Validation module

Checks schema, units and source identifiers.

All names, organizations and evidence in this scenario are fictional.

## Explore

Follow [[Components/Observation store]] or return to [[Welcome]]. Open the local graph to compare wiki links with named property relationships.
