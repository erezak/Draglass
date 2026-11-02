---
id: lumen-018
fqn: demo.lumen.system.field-portal
type: System
subtype: APPLICATION
description: Shows incoming readings and field feedback.
tags:
- lumen/system
relationships:
- relation: owned_by
  target: '[[Teams/Field team]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Field portal owned by Field team.
- relation: calls
  target: '[[Systems/Beacon service]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Field portal calls Beacon service.
- relation: depends_on
  target: '[[Systems/Identity service]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Field portal depends on Identity service.
- relation: composed_of
  target: '[[Components/Feedback cache]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Field portal composed of Feedback cache.
- relation: sourced_from
  target: '[[Sources/Design review]]'
---

# Field portal

Shows incoming readings and field feedback.

All names, organizations and evidence in this scenario are fictional.

## Explore

Follow [[Systems/Atlas catalog]] or return to [[Welcome]]. Open the local graph to compare wiki links with named property relationships.
