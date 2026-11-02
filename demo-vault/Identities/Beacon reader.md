---
id: lumen-009
fqn: demo.lumen.identity.beacon-reader
type: Identity
subtype: SERVICE_ACCOUNT
description: Read-only automation identity for approved observations.
tags:
- lumen/identity
relationships:
- relation: owned_by
  target: '[[Teams/Platform team]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Beacon reader owned by Platform team.
- relation: sourced_from
  target: '[[Sources/Design review]]'
---

# Beacon reader

Read-only automation identity for approved observations.

All names, organizations and evidence in this scenario are fictional.

## Explore

Follow [[Objectives/Trustworthy observations]] or return to [[Welcome]]. Open the local graph to compare wiki links with named property relationships.
