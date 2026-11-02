---
id: lumen-019
fqn: demo.lumen.system.atlas-catalog
type: System
subtype: PLATFORM
description: Indexes research observations and their provenance.
tags:
- lumen/system
relationships:
- relation: owned_by
  target: '[[Teams/Platform team]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Atlas catalog owned by Platform team.
- relation: composed_of
  target: '[[Components/Catalog API]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Atlas catalog composed of Catalog API.
- relation: governed_by
  target: '[[Policies/Research access]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Atlas catalog governed by Research access.
- relation: sourced_from
  target: '[[Sources/Design review]]'
---

# Atlas catalog

Indexes research observations and their provenance.

All names, organizations and evidence in this scenario are fictional.

## Explore

Follow [[Systems/Identity service]] or return to [[Welcome]]. Open the local graph to compare wiki links with named property relationships.
