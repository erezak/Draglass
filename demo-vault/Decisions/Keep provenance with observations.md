---
id: lumen-036
fqn: demo.lumen.decisionrecord.keep-provenance-with-observations
type: DecisionRecord
subtype: ARCHITECTURAL
description: Record source identifiers beside the observation data.
tags:
- lumen/decisionrecord
relationships:
- relation: informed_by
  target: '[[Concepts/Traceability]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Keep provenance with observations informed by Traceability.
- relation: supports
  target: '[[Objectives/Trustworthy observations]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Keep provenance with observations supports Trustworthy observations.
- relation: sourced_from
  target: '[[Sources/Design review]]'
status: ACCEPTED
options_considered:
- Sidecar provenance files
- Provenance beside each observation
---

# Keep provenance with observations

Record source identifiers beside the observation data.

All names, organizations and evidence in this scenario are fictional.

## Explore

Follow [[Decisions/Cache field feedback]] or return to [[Welcome]]. Open the local graph to compare wiki links with named property relationships.
