---
id: lumen-023
fqn: demo.lumen.component.observation-store
type: Component
subtype: DATABASE
description: Retains observations and original collection identifiers.
tags:
- lumen/component
relationships:
- relation: governed_by
  target: '[[Policies/Observation retention]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Observation store governed by Observation retention.
- relation: sourced_from
  target: '[[Sources/Design review]]'
---

# Observation store

Retains observations and original collection identifiers.

All names, organizations and evidence in this scenario are fictional.

## Explore

Follow [[Components/Feedback cache]] or return to [[Welcome]]. Open the local graph to compare wiki links with named property relationships.
