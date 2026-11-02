---
id: lumen-034
fqn: demo.lumen.behavior.reject-missing-source
type: Behavior
subtype: ACCEPTANCE_CRITERION
description: Reject a reading if it has no source identifier.
tags:
- lumen/behavior
relationships:
- relation: implements
  target: '[[Concepts/Validated observation]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Reject missing source implements Validated observation.
- relation: sourced_from
  target: '[[Sources/Design review]]'
given:
- A reading without a source identifier
when:
- The gateway receives the reading
then:
- Reject it with an explanation
---

# Reject missing source

Reject a reading if it has no source identifier.

All names, organizations and evidence in this scenario are fictional.

## Explore

Follow [[Behaviors/Retry a field batch]] or return to [[Welcome]]. Open the local graph to compare wiki links with named property relationships.
