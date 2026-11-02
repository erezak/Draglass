---
id: lumen-013
fqn: demo.lumen.capability.observation-intake
type: Capability
subtype: TECHNICAL
description: Accept and validate readings from field instruments.
tags:
- lumen/capability
relationships:
- relation: supports
  target: '[[Objectives/Trustworthy observations]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Observation intake supports Trustworthy observations.
- relation: delivered_by
  target: '[[Systems/Beacon service]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Observation intake delivered by Beacon service.
- relation: owned_by
  target: '[[Teams/Platform team]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Observation intake owned by Platform team.
- relation: sourced_from
  target: '[[Sources/Design review]]'
---

# Observation intake

Accept and validate readings from field instruments.

All names, organizations and evidence in this scenario are fictional.

## Explore

Follow [[Capabilities/Field feedback]] or return to [[Welcome]]. Open the local graph to compare wiki links with named property relationships.
