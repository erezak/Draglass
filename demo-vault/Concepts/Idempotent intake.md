---
id: lumen-033
fqn: demo.lumen.concept.idempotent-intake
type: Concept
subtype: PATTERN
description: Repeating a batch must not create duplicate observations.
tags:
- lumen/concept
relationships:
- relation: associated_with
  target: '[[Systems/Beacon service]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Idempotent intake associated with Beacon service.
- relation: sourced_from
  target: '[[Sources/Design review]]'
---

# Idempotent intake

Repeating a batch must not create duplicate observations.

All names, organizations and evidence in this scenario are fictional.

## Explore

Follow [[Behaviors/Reject missing source]] or return to [[Welcome]]. Open the local graph to compare wiki links with named property relationships.
