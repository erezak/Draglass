---
id: lumen-017
fqn: demo.lumen.system.beacon-service
type: System
subtype: SERVICE
description: Validates readings and records their original source.
operations:
  tier: 1
  readiness: green
tags:
- lumen/system
relationships:
- relation: owned_by
  target: '[[Teams/Platform team]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Beacon service owned by Platform team.
- relation: composed_of
  target: '[[Components/Sensor gateway]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Beacon service composed of Sensor gateway.
- relation: composed_of
  target: '[[Components/Validation module]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Beacon service composed of Validation module.
- relation: composed_of
  target: '[[Components/Observation store]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Beacon service composed of Observation store.
- relation: implemented_by
  target: '[[Sources/Beacon repository]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Beacon service implemented by Beacon repository.
- relation: governed_by
  target: '[[Policies/Observation retention]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Beacon service governed by Observation retention.
- relation: calls
  target: '[[Systems/Atlas catalog]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Beacon service calls Atlas catalog.
- relation: sourced_from
  target: '[[Sources/Design review]]'
tech_stack:
- Node.js
- SQLite
business_domain: Coastal research
---

# Beacon service

Validates readings and records their original source.

All names, organizations and evidence in this scenario are fictional.

## Explore

Follow [[Systems/Field portal]] or return to [[Welcome]]. Open the local graph to compare wiki links with named property relationships.

## Open questions

A proposed [[Systems/Weather relay]] is intentionally missing. Its hollow node lets you try creating a new entity. The unnamed wiki link is separate from the named property relationships.
