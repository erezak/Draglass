---
id: lumen-035
fqn: demo.lumen.behavior.retry-a-field-batch
type: Behavior
subtype: SCENARIO
description: Retrying a previously accepted batch leaves one observation.
tags:
- lumen/behavior
relationships:
- relation: associated_with
  target: '[[Components/Sensor gateway]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Retry a field batch associated with Sensor gateway.
- relation: sourced_from
  target: '[[Sources/Design review]]'
---

# Retry a field batch

Retrying a previously accepted batch leaves one observation.

All names, organizations and evidence in this scenario are fictional.

## Explore

Follow [[Decisions/Keep provenance with observations]] or return to [[Welcome]]. Open the local graph to compare wiki links with named property relationships.
