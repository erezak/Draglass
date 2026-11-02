---
id: lumen-016
fqn: demo.lumen.capability.rollout-checks
type: Capability
subtype: OPERATIONAL
description: Verify a release against a repeatable checklist.
tags:
- lumen/capability
relationships:
- relation: supports
  target: '[[Objectives/Reviewable delivery]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Rollout checks supports Reviewable delivery.
- relation: delivered_by
  target: '[[Systems/Field portal]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Rollout checks delivered by Field portal.
- relation: sourced_from
  target: '[[Sources/Design review]]'
---

# Rollout checks

Verify a release against a repeatable checklist.

All names, organizations and evidence in this scenario are fictional.

## Explore

Follow [[Systems/Beacon service]] or return to [[Welcome]]. Open the local graph to compare wiki links with named property relationships.
