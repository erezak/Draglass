---
id: lumen-021
fqn: demo.lumen.component.sensor-gateway
type: Component
subtype: GATEWAY
description: Receives instrument batches and forwards validated payloads.
tags:
- lumen/component
relationships:
- relation: depends_on
  target: '[[Components/Validation module]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Sensor gateway depends on Validation module.
- relation: owned_by
  target: '[[People/Noam Levi]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Sensor gateway owned by Noam Levi.
- relation: governed_by
  target: '[[Policies/Research access]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Sensor gateway governed by Research access.
- relation: sourced_from
  target: '[[Sources/Design review]]'
---

# Sensor gateway

Receives instrument batches and forwards validated payloads.

All names, organizations and evidence in this scenario are fictional.

## Explore

Follow [[Components/Validation module]] or return to [[Welcome]]. Open the local graph to compare wiki links with named property relationships.
